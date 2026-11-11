#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const file = args.find((arg) => !arg.startsWith("--"));
const apply = args.includes("--apply");

if (!file) {
  console.error("Usage: npm run import:heroes-motors -- chemin/resultats.json [--apply]");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.");

const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();
const cleanStrings = (value) => Array.isArray(value) ? value.map((item) => typeof item === "string" ? item.trim() : "").filter(Boolean) : [];
const source = JSON.parse(await readFile(file, "utf8"));
const rows = Array.isArray(source) ? source : source.results;
if (!Array.isArray(rows)) throw new Error("Le JSON doit être un tableau ou contenir une propriété results.");

const issues = [];
const candidates = [];
const emails = new Map();
const responseIds = new Set();

for (const [index, row] of rows.entries()) {
  const line = index + 1;
  const email = normalizeEmail(row.email);
  const sourceResponseId = String(row.source_response_id ?? row.response_id ?? "").trim();
  const firstName = String(row.first_name ?? row.prenom ?? "").trim();
  const portrait = String(row.portrait ?? "").trim();
  const motors = cleanStrings(row.motors);
  const heroes = cleanStrings(row.heroes);
  const errors = [];
  if (!sourceResponseId) errors.push("identifiant source manquant");
  if (!email || !email.includes("@")) errors.push("e-mail manquant ou invalide");
  if (!firstName) errors.push("prénom manquant");
  if (!portrait) errors.push("portrait manquant");
  if (motors.length < 3 || motors.length > 6) errors.push("3 à 6 moteurs requis");
  if (heroes.length !== 3) errors.push("3 héros requis");
  if (responseIds.has(sourceResponseId)) errors.push("identifiant source en double");
  responseIds.add(sourceResponseId);
  emails.set(email, (emails.get(email) ?? 0) + 1);
  if (errors.length) issues.push({ line, email, errors });
  else candidates.push({ line, sourceResponseId, email, firstName, portrait, motors, heroes, sourcePayload: row });
}

for (const candidate of candidates) {
  if ((emails.get(candidate.email) ?? 0) > 1) issues.push({ line: candidate.line, email: candidate.email, errors: ["plusieurs réponses pour cet e-mail"] });
}

const uniqueCandidates = candidates.filter((candidate) => (emails.get(candidate.email) ?? 0) === 1);
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const authUsers = [];
for (let page = 1; ; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  authUsers.push(...data.users);
  if (data.users.length < 1000) break;
}

const usersByEmail = new Map();
for (const user of authUsers) {
  const email = normalizeEmail(user.email);
  if (!email) continue;
  const list = usersByEmail.get(email) ?? [];
  list.push(user);
  usersByEmail.set(email, list);
}

const ready = [];
for (const candidate of uniqueCandidates) {
  const matches = usersByEmail.get(candidate.email) ?? [];
  if (matches.length !== 1) {
    issues.push({ line: candidate.line, email: candidate.email, errors: [matches.length ? "plusieurs comptes correspondent" : "aucun compte trouvé"] });
    continue;
  }
  const user = matches[0];
  const { data: profile } = await supabase.from("profiles").select("id,deactivated").eq("id", user.id).maybeSingle();
  if (!profile) {
    issues.push({ line: candidate.line, email: candidate.email, errors: ["compte Auth sans profil Ministry"] });
    continue;
  }
  ready.push({
    user_id: user.id,
    source_response_id: candidate.sourceResponseId,
    source_email: candidate.email,
    first_name: candidate.firstName,
    portrait: candidate.portrait,
    motors: candidate.motors,
    heroes: candidate.heroes,
    source_payload: candidate.sourcePayload,
    validation_status: "validated",
    publication_status: "draft",
  });
}

const report = { mode: apply ? "IMPORT" : "SIMULATION", received: rows.length, ready: ready.length, anomalies: issues.length, issues };
console.log(JSON.stringify(report, null, 2));

if (!apply) {
  console.log("\nAucune donnée modifiée. Relancez avec --apply après validation du rapport.");
  process.exit(issues.length ? 2 : 0);
}
if (issues.length) throw new Error("Import refusé : corrigez toutes les anomalies avant --apply.");

for (const row of ready) {
  const { data: existing, error: readError } = await supabase.from("heroes_motors_results").select("id,publication_status").or(`user_id.eq.${row.user_id},source_response_id.eq.${row.source_response_id}`).maybeSingle();
  if (readError) throw readError;
  if (existing?.publication_status === "published") throw new Error(`Résultat déjà publié, non écrasé : ${row.source_email}`);
  const query = existing
    ? supabase.from("heroes_motors_results").update(row).eq("id", existing.id)
    : supabase.from("heroes_motors_results").insert(row);
  const { error } = await query;
  if (error) throw new Error(`${row.source_email}: ${error.message}`);
}
console.log(`${ready.length} restitution(s) importée(s) en brouillon. Aucune publication automatique.`);
