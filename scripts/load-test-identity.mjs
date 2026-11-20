#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

const PRODUCTION_PROJECT_REF = "jrdjqkvagnqpchygxrkz";
const PRODUCTION_HOSTS = new Set(["ministryschool.fr", "www.ministryschool.fr"]);
const allowedUserCounts = new Set([50, 300, 400, 500]);

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
const users = Number(argument("users", "300"));
const reportPath = argument("report", process.env.LOAD_TEST_REPORT);

if (process.env.LOAD_TEST_AUTHORIZED !== "YES") {
  throw new Error("Garde-fou : définir LOAD_TEST_AUTHORIZED=YES uniquement pour un environnement de test autorisé.");
}
if (!allowedUserCounts.has(users)) throw new Error("--users doit valoir 50, 300, 400 ou 500.");

const appHost = new URL(appUrl).hostname;
const supabaseHost = new URL(supabaseUrl).hostname;
if (PRODUCTION_HOSTS.has(appHost) || supabaseHost.startsWith(`${PRODUCTION_PROJECT_REF}.`)) {
  throw new Error("Garde-fou : ce script refuse explicitement les productions Ministry School et Supabase.");
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const accounts = Array.isArray(manifest.accounts) ? manifest.accounts.slice(0, users) : [];
if (accounts.length !== users) throw new Error(`Le manifeste doit contenir ${users} comptes de test.`);
if (accounts.some((account) => !account?.email || !account?.password || !/load[ -]?test/i.test(account.email))) {
  throw new Error("Tous les comptes doivent être explicitement nommés load-test.");
}

const metrics = Object.fromEntries(["gallery", "tool", "publication", "afterPublication"].map((step) => [step, []]));
const statuses = new Map();

function percentile(values, ratio) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)] * 10) / 10;
}

function sessionCookie(session) {
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const name = `sb-${projectRef}-auth-token`;
  const value = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
  if (value.length <= 3180) return `${name}=${value}`;
  const chunks = [];
  for (let index = 0, offset = 0; offset < value.length; index += 1, offset += 3180) chunks.push(`${name}.${index}=${value.slice(offset, offset + 3180)}`);
  return chunks.join("; ");
}

async function authenticate(account) {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json", "User-Agent": "MinistrySchool-Identity-Load-Test/1.0" },
    body: JSON.stringify({ email: account.email, password: account.password }),
  });
  const session = await response.json().catch(() => ({}));
  if (!response.ok || !session.access_token) throw new Error(`Authentification impossible pour ${account.email} (${response.status}).`);
  return { account, cookie: sessionCookie(session) };
}

async function authenticateAll() {
  const sessions = [];
  for (let offset = 0; offset < accounts.length; offset += 20) {
    sessions.push(...await Promise.all(accounts.slice(offset, offset + 20).map(authenticate)));
  }
  return sessions;
}

async function timed(step, operation) {
  const started = performance.now();
  const response = await operation();
  metrics[step].push(performance.now() - started);
  const key = `${step}:${response.status}`;
  statuses.set(key, (statuses.get(key) ?? 0) + 1);
  return response;
}

async function runFlow({ cookie }) {
  const headers = { cookie, "User-Agent": "MinistrySchool-Identity-Load-Test/1.0" };
  const gallery = await timed("gallery", () => fetch(`${appUrl}/etudiant/identite`, { headers, redirect: "manual" }));
  if (!gallery.ok) return false;

  const tool = await timed("tool", () => fetch(`${appUrl}/etudiant/identite/fruit-de-lesprit`, { headers, redirect: "manual" }));
  if (!tool.ok) return false;

  const publication = await timed("publication", () => fetch(`${appUrl}/api/apps/grace-identity`, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ testKey: "fruit", answers: {} }),
  }));
  if (!publication.ok) return false;

  const afterPublication = await timed("afterPublication", () => fetch(`${appUrl}/etudiant/identite`, { headers, redirect: "manual" }));
  return afterPublication.ok;
}

const sessions = await authenticateAll();
const startedAt = new Date().toISOString();
const results = await Promise.all(sessions.map(runFlow));
const finishedAt = new Date().toISOString();

const summary = {
  authorizedEnvironment: true,
  topology: "single-generator-simultaneous-burst",
  users,
  startedAt,
  finishedAt,
  succeeded: results.filter(Boolean).length,
  failed: results.filter((result) => !result).length,
  httpStatuses: Object.fromEntries([...statuses.entries()].sort()),
  latencyMs: Object.fromEntries(Object.entries(metrics).map(([step, values]) => [step, {
    p50: percentile(values, 0.5),
    p95: percentile(values, 0.95),
    p99: percentile(values, 0.99),
    max: values.length ? Math.round(Math.max(...values) * 10) / 10 : null,
  }])),
  supabaseRequestBudgetPerUser: {
    gallery: "2 (+1 si avatar privé)",
    tool: 2,
    publication: 1,
    afterPublication: "2 (+1 si avatar privé)",
  },
  acceptance: {
    no429: ![...statuses.keys()].some((key) => key.endsWith(":429")),
    allFlowsSucceeded: results.every(Boolean),
    galleryP95Under2500ms: percentile(metrics.gallery, 0.95) < 2500,
    publicationP95Under1500ms: percentile(metrics.publication, 0.95) < 1500,
  },
};

console.log(JSON.stringify(summary, null, 2));
if (reportPath) await writeFile(reportPath, `${JSON.stringify(summary, null, 2)}\n`, { mode: 0o600 });
if (!Object.values(summary.acceptance).every(Boolean)) process.exitCode = 2;
