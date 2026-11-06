#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

const PRODUCTION_PROJECT_REF = "jrdjqkvagnqpchygxrkz";
const PRODUCTION_HOSTS = new Set(["ministryschool.fr", "www.ministryschool.fr"]);

function argument(name, fallback) {
  return process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
}

function required(name, value) {
  if (!value) throw new Error(`${name} est obligatoire.`);
  return value;
}

const appUrl = required("APP_URL", process.env.APP_URL)?.replace(/\/$/, "");
const supabaseUrl = required("SUPABASE_URL", process.env.SUPABASE_URL)?.replace(/\/$/, "");
const anonKey = required("SUPABASE_ANON_KEY", process.env.SUPABASE_ANON_KEY);
const manifestPath = required("LOAD_TEST_MANIFEST", process.env.LOAD_TEST_MANIFEST);
const users = Number(argument("users", "50"));
const durationSeconds = Number(argument("duration", "120"));
const reportPath = argument("report", process.env.LOAD_TEST_REPORT);

if (process.env.LOAD_TEST_AUTHORIZED !== "YES") {
  throw new Error("Garde-fou : définir LOAD_TEST_AUTHORIZED=YES uniquement pour un environnement de test autorisé.");
}
if (!Number.isInteger(users) || ![50, 100, 200, 400, 500].includes(users)) {
  throw new Error("--users doit être l'un des paliers autorisés : 50, 100, 200, 400 ou 500.");
}
if (!Number.isFinite(durationSeconds) || durationSeconds < 30 || durationSeconds > 600) {
  throw new Error("--duration doit être compris entre 30 et 600 secondes.");
}

const appHost = new URL(appUrl).hostname;
const supabaseHost = new URL(supabaseUrl).hostname;
if (PRODUCTION_HOSTS.has(appHost) || supabaseHost.startsWith(`${PRODUCTION_PROJECT_REF}.`)) {
  throw new Error("Garde-fou : ce script refuse explicitement les productions Ministry School et Supabase.");
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const accounts = Array.isArray(manifest.accounts) ? manifest.accounts.slice(0, users) : [];
if (accounts.length !== users) {
  throw new Error(`Le manifeste doit contenir au moins ${users} comptes de test distincts.`);
}
if (accounts.some((account) => !account?.email || !account?.password || !/load[ -]?test/i.test(account.email))) {
  throw new Error("Garde-fou : tous les comptes doivent être explicitement nommés load-test.");
}
if (new Set(accounts.map((account) => account.email.toLowerCase())).size !== users) {
  throw new Error("Le manifeste contient des comptes dupliqués.");
}

const metrics = {
  token: [],
  claim: [],
  page: [],
  usage: [],
  flows: [],
  statuses: new Map(),
};
let activeFlows = 0;
let peakActiveFlows = 0;

function recordStatus(step, status) {
  const key = `${step}:${status}`;
  metrics.statuses.set(key, (metrics.statuses.get(key) ?? 0) + 1);
}

function percentile(values, ratio) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)] * 10) / 10;
}

async function timed(step, operation) {
  const start = performance.now();
  const response = await operation();
  metrics[step].push(performance.now() - start);
  recordStatus(step, response.status);
  return response;
}

function sessionCookie(session) {
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const name = `sb-${projectRef}-auth-token`;
  const value = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
  if (value.length <= 3180) return `${name}=${value}`;
  const chunks = [];
  for (let index = 0, offset = 0; offset < value.length; index += 1, offset += 3180) {
    chunks.push(`${name}.${index}=${value.slice(offset, offset + 3180)}`);
  }
  return chunks.join("; ");
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function runFlow(account) {
  activeFlows += 1;
  peakActiveFlows = Math.max(peakActiveFlows, activeFlows);
  const flowStart = performance.now();
  try {
    const token = await timed("token", () => fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json", "User-Agent": "MinistrySchool-Authorized-Load-Test/1.0" },
      body: JSON.stringify({ email: account.email, password: account.password }),
    }));
    const session = await token.json().catch(() => ({}));
    if (!token.ok || !session.access_token) return { ok: false, failedAt: "token", status: token.status };

    const claim = await timed("claim", () => fetch(`${supabaseUrl}/rest/v1/rpc/claim_delegations`, {
      method: "POST",
      headers: { apikey: anonKey, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json", "User-Agent": "MinistrySchool-Authorized-Load-Test/1.0" },
      body: "{}",
    }));

    const page = await timed("page", () => fetch(`${appUrl}/etudiant`, {
      headers: { cookie: sessionCookie(session), "User-Agent": "MinistrySchool-Authorized-Load-Test/1.0" },
      redirect: "manual",
    }));
    const redirectedToLogin = page.status >= 300 && page.status < 400 && String(page.headers.get("location") ?? "").includes("/login");
    let usageOk = false;
    if (page.status === 200 && !redirectedToLogin) {
      // Reproduit l'écriture analytique différée du navigateur sans la remettre
      // dans le burst Auth/PostgREST initial.
      await wait(15_000 + Math.random() * 60_000);
      const usage = await timed("usage", () => fetch(`${supabaseUrl}/rest/v1/rpc/record_student_page_view`, {
        method: "POST",
        headers: { apikey: anonKey, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json", "User-Agent": "MinistrySchool-Authorized-Load-Test/1.0" },
        body: JSON.stringify({ p_page_key: "home", p_record_sign_in: true }),
      }));
      usageOk = usage.ok;
    }
    return {
      ok: page.status === 200 && !redirectedToLogin,
      claimOk: claim.ok,
      usageOk,
      failedAt: page.status === 200 && !redirectedToLogin ? null : "page",
      status: page.status,
    };
  } catch {
    return { ok: false, failedAt: "network", status: 0 };
  } finally {
    metrics.flows.push(performance.now() - flowStart);
    activeFlows -= 1;
  }
}

const intervalMs = users === 1 ? 0 : (durationSeconds * 1000) / (users - 1);
const startedAt = new Date().toISOString();
const results = await Promise.all(accounts.map((account, index) => new Promise((resolve) => {
  setTimeout(() => resolve(runFlow(account)), Math.round(index * intervalMs));
})));
const finishedAt = new Date().toISOString();

const summary = {
  authorizedEnvironment: true,
  appHost,
  supabaseHost,
  topology: "single-generator-egress-ip",
  users,
  configuredArrivalWindowSeconds: durationSeconds,
  startedAt,
  finishedAt,
  succeeded: results.filter((result) => result.ok).length,
  failed: results.filter((result) => !result.ok).length,
  claimFailures: results.filter((result) => result.ok && !result.claimOk).length,
  usageFailures: results.filter((result) => result.ok && !result.usageOk).length,
  failedAt: Object.fromEntries(["token", "page", "network"].map((step) => [step, results.filter((result) => result.failedAt === step).length])),
  httpStatuses: Object.fromEntries([...metrics.statuses.entries()].sort()),
  latencyMs: Object.fromEntries(["token", "claim", "page", "usage", "flows"].map((step) => [step, {
    p50: percentile(metrics[step], 0.50),
    p95: percentile(metrics[step], 0.95),
    p99: percentile(metrics[step], 0.99),
    max: metrics[step].length ? Math.round(Math.max(...metrics[step]) * 10) / 10 : null,
  }])),
  peakActiveFlows,
  acceptance: {
    no429: ![...metrics.statuses.keys()].some((key) => key.endsWith(":429")),
    successRateAtLeast999: results.filter((result) => result.ok).length / users >= 0.999,
    allPostLoginWritesSucceeded: results.every((result) => !result.ok || (result.claimOk && result.usageOk)),
    tokenP95Under1500ms: percentile(metrics.token, 0.95) < 1500,
    pageP95Under2500ms: percentile(metrics.page, 0.95) < 2500,
  },
};

console.log(JSON.stringify(summary, null, 2));
if (reportPath) await writeFile(reportPath, `${JSON.stringify(summary, null, 2)}\n`, { mode: 0o600 });
if (!Object.values(summary.acceptance).every(Boolean)) process.exitCode = 2;
