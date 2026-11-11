#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const file = args.find((arg) => !arg.startsWith("--"));
const apply = args.includes("--apply");
const confirmed = args.includes("--confirm-production-import");
const reportPath = args.find((arg) => arg.startsWith("--report="))?.slice(9);
if (!file) { console.error("Usage: npm run import:heroes-motors -- resultats.csv [--report=rapport.json] [--apply --confirm-production-import]"); process.exit(1); }
if (apply && !confirmed) throw new Error("Import bloqué : ajoutez --confirm-production-import uniquement après validation du rapport de préimport.");

const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const normalizedText = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

// RFC 4180 : les portraits contiennent des retours à la ligne et deux colonnes
// ont volontairement le même titre. Un objet indexé par en-tête perdrait une colonne.
function parseCsv(source) {
  const rows = []; let row = [], field = "", quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  return rows.filter((item) => item.some((cell) => cell.trim()));
}

const source = await readFile(file, "utf8");
const csv = parseCsv(source.replace(/^\uFEFF/, ""));
if (csv.length < 2 || csv[0].length < 13) throw new Error("Le fichier ne correspond pas au formulaire Test des héros attendu.");
const [header, ...rawRows] = csv;
for (const label of ["Horodateur", "Adresse e-mail", "Texte", "Moteurs"]) if (!header.includes(label)) throw new Error(`Colonne requise absente : ${label}`);

const noneHero = /^(aucun|aucune|personne|n[ée]ant|non)$/i;
// Correspondances validées manuellement par Rose-Alice le 11 novembre 2026.
// Elles évitent de modifier les portraits tout en levant les faux positifs liés
// à un surnom, un nom de famille seul ou une abréviation de prénom.
const verifiedPortraitNames = new Map([
  ["lantonirinananou@yahoo.fr", "nanou"],
  ["giseleamouzou37@gmail.com", "gisele"],
  ["jpmag95@gmail.com", "jean paul"],
]);
const rows = rawRows.map((cells, index) => {
  const sourceRow = index + 2;
  const submittedAt = cells[0]?.trim() || null;
  const respondentEmail = normalizeEmail(cells[1]);
  const heroesRaw = [cells[2], cells[4], cells[6]].map((item) => String(item ?? "").trim());
  const heroes = heroesRaw.filter((item) => item && !noneHero.test(item));
  const fullName = String(cells[8] ?? "").trim();
  const accountEmail = normalizeEmail(cells[9]);
  const portrait = String(cells[10] ?? "").trim();
  const motors = String(cells[11] ?? "").split(/\s*;\s*|\n+/).map((item) => item.trim()).filter(Boolean);
  const confidentialNote = String(cells[12] ?? "").trim();
  const readablePortrait = portrait.replace(/&nbsp;/gi, " ").replace(/<br\s*\/?\s*>/gi, "\n");
  const openingMatch = readablePortrait.match(/^Moi,\s*([^,]+),\s*je suis(?:…|\.\.\.)?/i);
  const confidentialAnswer = ["non", "no", "c est confidentiel"].includes(normalizedText(fullName));
  const confidentialPortrait = normalizedText(readablePortrait).startsWith("tu as choisi de garder tes reponses au test des heros confidentielles");
  const communicationStatus = confidentialNote || confidentialAnswer || confidentialPortrait ? "refused" : "authorized";
  const firstName = openingMatch?.[1].trim() || fullName.split(/\s+/)[0] || "";
  const sourceResponseId = `heroes-form-${sha256([submittedAt, respondentEmail, accountEmail, fullName].join("|")).slice(0, 32)}`;
  const anomalies = [];
  if (!validEmail(accountEmail)) anomalies.push("invalid_account_email");
  if (!fullName) anomalies.push("missing_name");
  if (!portrait) anomalies.push("missing_portrait");
  if (!motors.length) anomalies.push("missing_motors");
  if (heroes.length < 2) anomalies.push("incomplete_heroes");
  if (communicationStatus === "authorized" && portrait && !openingMatch) anomalies.push("unexpected_portrait_opening");
  if (communicationStatus === "authorized" && openingMatch && fullName) {
    const portraitName = normalizedText(openingMatch[1]);
    const fullNameNormalized = normalizedText(fullName);
    const nameTokens = fullNameNormalized.split(" ").filter(Boolean);
    const verifiedName = verifiedPortraitNames.get(accountEmail);
    if (!fullNameNormalized.includes(portraitName) && !nameTokens.some((token) => portraitName.includes(token)) && verifiedName !== portraitName) anomalies.push("portrait_name_mismatch");
  }
  return { sourceRow, sourceResponseId, submittedAt, respondentEmail, accountEmail, fullName, firstName, portrait, motors, heroes, heroesRaw, communicationStatus, confidentialNote, anomalies, sourcePayload: Object.fromEntries(header.map((label, column) => [`${column + 1}:${label}`, cells[column] ?? ""])) };
});

const byEmail = new Map();
for (const row of rows) { if (!row.accountEmail) continue; const group = byEmail.get(row.accountEmail) ?? []; group.push(row.sourceRow); byEmail.set(row.accountEmail, group); }
for (const row of rows) if ((byEmail.get(row.accountEmail)?.length ?? 0) > 1) row.anomalies.push("duplicate_account_email");

let accountMatching = "not_run"; const accounts = [];
const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (url && key) {
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  for (let page = 1; ; page += 1) { const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 }); if (error) throw error; accounts.push(...data.users); if (data.users.length < 1000) break; }
  accountMatching = "complete";
}
const usersByEmail = new Map();
for (const user of accounts) { const email = normalizeEmail(user.email); if (!email) continue; const matches = usersByEmail.get(email) ?? []; matches.push(user); usersByEmail.set(email, matches); }
for (const row of rows) {
  row.userId = null; row.assignmentStatus = "unassigned";
  if (accountMatching !== "complete" || !validEmail(row.accountEmail)) continue;
  const matches = usersByEmail.get(row.accountEmail) ?? [];
  if (matches.length === 1) { row.userId = matches[0].id; row.assignmentStatus = "assigned"; }
  else if (matches.length > 1) { row.assignmentStatus = "anomaly"; row.anomalies.push("multiple_accounts"); }
  else row.anomalies.push("account_not_found");
}

const counts = {
  linesAnalyzed: rows.length,
  communicationRefused: rows.filter((row) => row.communicationStatus === "refused").length,
  validAccountEmails: rows.filter((row) => validEmail(row.accountEmail)).length,
  invalidAccountEmails: rows.filter((row) => !validEmail(row.accountEmail)).length,
  duplicateEmails: [...byEmail.values()].filter((group) => group.length > 1).length,
  completePortraits: rows.filter((row) => row.portrait).length,
  portraitsWithDisplayHtml: rows.filter((row) => /<br\s*\/?\s*>|&nbsp;/i.test(row.portrait)).length,
  expectedPortraitOpening: rows.filter((row) => row.communicationStatus === "authorized" && !row.anomalies.includes("unexpected_portrait_opening")).length,
  portraitNameMismatches: rows.filter((row) => row.anomalies.includes("portrait_name_mismatch")).length,
  completeMotors: rows.filter((row) => row.motors.length).length,
  twoHeroes: rows.filter((row) => row.heroes.length === 2).length,
  threeHeroes: rows.filter((row) => row.heroes.length === 3).length,
  assigned: rows.filter((row) => row.assignmentStatus === "assigned").length,
  unassigned: rows.filter((row) => row.assignmentStatus === "unassigned").length,
  anomalies: rows.filter((row) => row.anomalies.length).length,
};
const report = { mode: apply ? "IMPORT" : "PREIMPORT", sourceFileHash: sha256(source), accountMatching, counts, issues: rows.filter((row) => row.anomalies.length).map((row) => ({ sourceRow: row.sourceRow, email: row.accountEmail, anomalies: [...new Set(row.anomalies)] })) };
console.log(JSON.stringify(report, null, 2));
if (reportPath) await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
if (!apply) { console.log("\nAucune donnée modifiée. L'import reste bloqué jusqu'à validation explicite du rapport."); process.exit(0); }
if (!url || !key) throw new Error("Import impossible sans NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.");

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
for (const row of rows) {
  const payload = { user_id: row.userId, source_response_id: row.sourceResponseId, source_email: row.accountEmail || row.respondentEmail || null, first_name: row.firstName, portrait: row.portrait || null, motors: row.motors, heroes: row.heroes, source_payload: row.sourcePayload, communication_status: row.communicationStatus, visible: false, assignment_status: row.assignmentStatus, anomalies: [...new Set(row.anomalies)], source_submitted_at: row.submittedAt, source_file_hash: report.sourceFileHash, validation_status: row.anomalies.length ? "pending" : "validated", publication_status: "draft" };
  const { data: existing, error: readError } = await supabase.from("heroes_motors_results").select("id,publication_status").eq("source_response_id", row.sourceResponseId).maybeSingle();
  if (readError) throw readError;
  if (existing?.publication_status === "published") continue;
  const mutation = existing ? supabase.from("heroes_motors_results").update(payload).eq("id", existing.id) : supabase.from("heroes_motors_results").insert(payload);
  const { error } = await mutation; if (error) throw new Error(`Ligne ${row.sourceRow}: ${error.message}`);
}
console.log(`${rows.length} ligne(s) préparée(s) en brouillon, sans publication automatique.`);
