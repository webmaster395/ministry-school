#!/usr/bin/env node

import { chmod, readFile, writeFile } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "jrdjqkvagnqpchygxrkz";
const SUPABASE_URL = process.env.SUPABASE_URL || `https://${PROJECT_REF}.supabase.co`;
const APP_URL = (process.env.APP_URL || "https://www.ministryschool.fr").replace(/\/$/, "");
const EMAIL_DOMAIN = process.env.LOAD_TEST_EMAIL_DOMAIN || "loadtest.invalid";
const command = process.argv[2];
const batchArg = process.argv.find((arg) => arg.startsWith("--batch="))?.slice(8);
const batchId = batchArg || randomUUID();
const manifestPath = `/tmp/ministry-load-test-${batchId}.json`;
const csvPath = `/tmp/ministry-load-test-${batchId}.csv`;

async function readKeys() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_ANON_KEY) {
    return { service: process.env.SUPABASE_SERVICE_ROLE_KEY, anon: process.env.SUPABASE_ANON_KEY };
  }
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  if (!input.trim()) throw new Error("Clés absentes : fournir les variables d’environnement ou le JSON des clés Supabase sur stdin.");
  const keys = JSON.parse(input);
  const value = (name, type) => keys.find((key) => key.name === name && (!type || key.type === type))?.api_key;
  const service = value("service_role") || value("default", "secret");
  const anon = value("anon") || value("default", "publishable");
  if (!service || !anon) throw new Error("Clé service_role/secret ou anon/publishable introuvable.");
  return { service, anon };
}

async function clients() {
  const keys = await readKeys();
  return {
    keys,
    service: createClient(SUPABASE_URL, keys.service, { auth: { persistSession: false, autoRefreshToken: false } }),
  };
}

async function selectRepresentativeSession(service) {
  const baseFields = "id, session_date, start_time, end_time, day, session_type, ministry_id, description, summary, objectives, video_url, speaker_name, course_id, courses(title)";
  let response = await service.from("sessions").select(`${baseFields}, is_draft`).order("session_date", { ascending: false });
  if (response.error && /is_draft/i.test(response.error.message)) {
    response = await service.from("sessions").select(baseFields).order("session_date", { ascending: false });
  }
  if (response.error) throw response.error;
  const sessions = (response.data || []).filter((session) => session.is_draft !== true);
  if (!sessions.length) throw new Error("Aucun cours publié n’est disponible.");

  const ids = sessions.map((session) => session.id);
  const [{ data: materials, error: materialError }, { data: assignments, error: assignmentError }, { data: trainers }] = await Promise.all([
    service.from("materials").select("id, session_id, title, link_url, file_url").in("session_id", ids),
    service.from("assignments").select("id, session_id, title").in("session_id", ids),
    service.from("session_trainers").select("session_id").in("session_id", ids),
  ]);
  if (materialError) throw materialError;
  if (assignmentError) throw assignmentError;
  const score = (session) => {
    const resources = (materials || []).filter((item) => item.session_id === session.id).length;
    const work = (assignments || []).filter((item) => item.session_id === session.id).length;
    const trainer = !!session.speaker_name || (trainers || []).some((item) => item.session_id === session.id);
    return resources * 20 + work * 20 + Number(!!session.video_url) * 8 + Number(!!session.summary || !!session.description) * 4 + Number(!!session.objectives) * 4 + Number(trainer) * 4;
  };
  const session = sessions.sort((a, b) => score(b) - score(a))[0];
  return {
    session,
    material: (materials || []).find((item) => item.session_id === session.id) || null,
    assignmentCount: (assignments || []).filter((item) => item.session_id === session.id).length,
    score: score(session),
  };
}

function password() {
  return `Ms!${randomBytes(24).toString("base64url")}9a`;
}

async function writeManifest(manifest) {
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  await chmod(manifestPath, 0o600);
  const lines = ["email,password", ...manifest.accounts.map((account) => `${account.email},${account.password}`)];
  await writeFile(csvPath, `${lines.join("\n")}\n`, { mode: 0o600 });
  await chmod(csvPath, 0o600);
}

async function loadManifest() {
  return JSON.parse(await readFile(manifestPath, "utf8"));
}

async function createOne() {
  const { service } = await clients();
  const representative = await selectRepresentativeSession(service);
  const suffix = batchId.replaceAll("-", "").slice(0, 12);
  const email = `loadtest-student-${suffix}-001@${EMAIL_DOMAIN}`;
  const secret = password();
  const { data: created, error: authError } = await service.auth.admin.createUser({
    email,
    password: secret,
    email_confirm: true,
    user_metadata: { full_name: "LOAD TEST — 001", is_load_test: true, test_batch_id: batchId },
  });
  if (authError || !created.user) throw authError || new Error("Utilisateur Auth non créé.");

  const profile = {
    full_name: "LOAD TEST — 001",
    role: "student",
    ministry_id: representative.session.session_type === "ministere" ? representative.session.ministry_id : null,
    preferred_day: representative.session.day || null,
    email_confirmed: true,
    is_test_account: true,
    test_batch_id: batchId,
    notification_prefs: {},
  };
  const { error: profileError } = await service.from("profiles").update(profile).eq("id", created.user.id);
  if (profileError) {
    await service.auth.admin.deleteUser(created.user.id);
    throw profileError;
  }

  const manifest = {
    batchId,
    createdAt: new Date().toISOString(),
    appUrl: APP_URL,
    supabaseUrl: SUPABASE_URL,
    session: {
      id: representative.session.id,
      title: representative.session.courses?.title || representative.session.description || "Cours",
      material: representative.material,
      assignmentCount: representative.assignmentCount,
      hasVideo: !!representative.session.video_url,
    },
    accounts: [{ id: created.user.id, email, password: secret }],
  };
  await writeManifest(manifest);
  console.log(JSON.stringify({
    ok: true,
    batchId,
    email,
    session: manifest.session,
    emailConfirmedWithoutDelivery: true,
    manifestPath,
    csvPath,
  }, null, 2));
}

function cookieHeader(session) {
  const name = `sb-${PROJECT_REF}-auth-token`;
  const value = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
  if (value.length <= 3180) return `${name}=${value}`;
  const chunks = [];
  for (let index = 0, offset = 0; offset < value.length; index += 1, offset += 3180) {
    chunks.push(`${name}.${index}=${value.slice(offset, offset + 3180)}`);
  }
  return chunks.join("; ");
}

async function requestPage(path, cookie) {
  const response = await fetch(`${APP_URL}${path}`, { headers: { cookie }, redirect: "manual" });
  return { path, status: response.status, location: response.headers.get("location"), body: await response.text() };
}

async function smoke() {
  const manifest = await loadManifest();
  const account = manifest.accounts[0];
  const { keys } = await clients();
  const loginPage = await fetch(`${APP_URL}/login`, { redirect: "manual" });
  const token = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: keys.anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email: account.email, password: account.password }),
  });
  const session = await token.json();
  if (!token.ok) throw new Error(`Connexion refusée : HTTP ${token.status}`);

  const claim = await fetch(`${SUPABASE_URL}/rest/v1/rpc/claim_delegations`, {
    method: "POST",
    headers: { apikey: keys.anon, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
    body: "{}",
  });
  const cookie = cookieHeader(session);
  const pages = [
    { path: "/login", status: loginPage.status },
    await requestPage("/etudiant", cookie),
    await requestPage("/etudiant/cours", cookie),
    await requestPage(`/etudiant/seances/${manifest.session.id}`, cookie),
  ];
  for (const page of pages) {
    if (page.status !== 200 || String(page.location || "").includes("/login")) {
      throw new Error(`${page.path} inaccessible : HTTP ${page.status}${page.location ? ` → ${page.location}` : ""}`);
    }
  }
  const courseBody = pages[3].body || "";
  const material = manifest.session.material;
  const resourceVisible = !material || courseBody.includes(material.title) || courseBody.includes(material.link_url || "__absent__") || courseBody.includes(material.file_url || "__absent__");
  if (!resourceVisible) throw new Error("La ressource choisie n’apparaît pas dans la page du cours.");

  const logout = await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: "POST",
    headers: { apikey: keys.anon, Authorization: `Bearer ${session.access_token}` },
  });
  if (!logout.ok) throw new Error(`Déconnexion refusée : HTTP ${logout.status}`);
  console.log(JSON.stringify({
    ok: true,
    steps: pages.map(({ path, status }) => ({ path, status })),
    claimDelegationsStatus: claim.status,
    resourceVisible,
    logoutStatus: logout.status,
  }, null, 2));
}

const OWNED_TABLES = [
  ["course_notes", "user_id"],
  ["assignment_step_completions", "user_id"],
  ["assignment_completions", "user_id"],
  ["feature_preview_users", "user_id"],
  ["opportunity_registrations", "user_id"],
  ["enrollments", "student_id"],
  ["questions", "user_id"],
  ["submissions", "submitted_by"],
];

async function countOwned(service, table, column, ids) {
  const result = await service.from(table).select("*", { count: "exact", head: true }).in(column, ids);
  if (result.error) {
    return {
      table,
      skipped: true,
      reason: result.error.message || result.error.details || result.error.hint || result.error.code || "requête non disponible",
    };
  }
  return { table, count: result.count || 0 };
}

async function cleanup() {
  const manifest = await loadManifest();
  const { service } = await clients();
  const { data: profiles, error } = await service.from("profiles").select("id").eq("is_test_account", true).eq("test_batch_id", manifest.batchId);
  if (error) throw error;
  const ids = (profiles || []).map((profile) => profile.id);
  const expected = new Set(manifest.accounts.map((account) => account.id));
  if (ids.some((id) => !expected.has(id)) || ids.length !== expected.size) {
    throw new Error("Garde-fou activé : le contenu du lot ne correspond pas au manifeste local.");
  }
  const before = [];
  for (const [table, column] of OWNED_TABLES) before.push(await countOwned(service, table, column, ids));
  for (const account of manifest.accounts) {
    const { error: deleteError } = await service.auth.admin.deleteUser(account.id);
    if (deleteError) throw deleteError;
  }
  const { error: residualProfileError } = await service.from("profiles").delete().eq("is_test_account", true).eq("test_batch_id", manifest.batchId);
  if (residualProfileError) throw residualProfileError;
  const verification = await verifyBatch(service, manifest);
  console.log(JSON.stringify({ ok: verification.clean, deleted: ids.length, ownedRowsBeforeDeletion: before, verification }, null, 2));
  if (!verification.clean) process.exitCode = 2;
}

async function verifyBatch(service, manifest) {
  const ids = manifest.accounts.map((account) => account.id);
  const { count: profileCount, error } = await service.from("profiles").select("*", { count: "exact", head: true }).eq("test_batch_id", manifest.batchId);
  if (error) throw error;
  const owned = [];
  for (const [table, column] of OWNED_TABLES) owned.push(await countOwned(service, table, column, ids));
  const authMatches = [];
  let page = 1;
  while (true) {
    const { data, error: authError } = await service.auth.admin.listUsers({ page, perPage: 200 });
    if (authError) throw authError;
    authMatches.push(...data.users.filter((user) => user.user_metadata?.test_batch_id === manifest.batchId));
    if (data.users.length < 200) break;
    page += 1;
  }
  const residualRows = owned.filter((entry) => !entry.skipped && entry.count > 0);
  return { clean: profileCount === 0 && authMatches.length === 0 && residualRows.length === 0, profileCount, authUserCount: authMatches.length, owned };
}

async function verify() {
  const manifest = await loadManifest();
  const { service } = await clients();
  const result = await verifyBatch(service, manifest);
  console.log(JSON.stringify(result, null, 2));
  if (!result.clean) process.exitCode = 2;
}

const commands = { "create-one": createOne, smoke, cleanup, verify };
if (!commands[command]) {
  console.error("Usage: node scripts/load-test-accounts.mjs <create-one|smoke|cleanup|verify> --batch=<uuid>");
  process.exit(1);
}

try {
  await commands[command]();
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    message: error instanceof Error ? error.message : (error?.message || error?.details || error?.hint || error?.code || String(error)),
    code: error?.code,
    details: error?.details,
  }, null, 2));
  process.exit(1);
}
