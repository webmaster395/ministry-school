"use server";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parisLocalToIso } from "@/lib/availability";
import { getViewer } from "@/lib/data/viewer";
import { createClient } from "@/lib/supabase/server";

const value = (form: FormData, key: string, max = 20000) => String(form.get(key) ?? "").trim().slice(0, max);
const lines = (form: FormData, key: string) => value(form, key).split(/\n+/).map((item) => item.trim()).filter(Boolean);
const APPROVED_SOURCE_HASH = "c1a79b91d32efa13801e649cfdc4ab672f4004bd8c369ff18210bb47669de040";
const normalizeEmail = (raw: unknown) => String(raw ?? "").trim().toLowerCase();
const validEmail = (raw: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);
const normalizedText = (raw: unknown) => String(raw ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const hash = (raw: string) => createHash("sha256").update(raw).digest("hex");

function parseCsv(source: string) {
  const rows: string[][] = []; let row: string[] = [], field = "", quoted = false;
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

function submittedAt(raw: string) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/.exec(raw.trim());
  if (!match) return null;
  return parisLocalToIso(`${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`, `${match[4].padStart(2, "0")}:${match[5]}`);
}

const verifiedPortraitNames = new Map([["lantonirinananou@yahoo.fr", "nanou"], ["giseleamouzou37@gmail.com", "gisele"], ["jpmag95@gmail.com", "jean paul"]]);
const noneHero = /^(aucun|aucune|personne|n[ée]ant|non)$/i;

export async function importHeroesCsv(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer?.roles.superAdmin || viewer.deactivated) throw new Error("Accès refusé.");
  if (formData.get("confirmImport") !== "on") throw new Error("Confirmez l’import en production.");
  const file = formData.get("csv");
  if (!(file instanceof File) || !file.size || file.size > 2_000_000) throw new Error("Sélectionnez le fichier CSV validé.");
  const source = (await file.text()).replace(/^\uFEFF/, "");
  if (hash(source) !== APPROVED_SOURCE_HASH) throw new Error("Ce fichier ne correspond pas au CSV validé.");
  const csv = parseCsv(source); const [header, ...rawRows] = csv;
  if (header.length < 13 || rawRows.length !== 249) throw new Error("Le fichier validé doit contenir exactement 249 réponses et 13 colonnes.");

  const supabase = await createClient();
  const [{ data: accountRows, error: accountError }, { data: existingRows, error: existingError }] = await Promise.all([
    supabase.rpc("heroes_motors_admin_accounts"),
    supabase.from("heroes_motors_results").select("id,user_id,source_response_id,publication_status"),
  ]);
  if (accountError) throw new Error(`Comptes Ministry indisponibles : ${accountError.message}`);
  if (existingError) throw new Error(`Contrôle des résultats existants impossible : ${existingError.message}`);
  const accountsByEmail = new Map<string, Array<{ user_id: string; email: string; full_name: string }>>();
  for (const account of accountRows ?? []) { const email = normalizeEmail(account.email); const matches = accountsByEmail.get(email) ?? []; matches.push(account); accountsByEmail.set(email, matches); }
  const existingBySource = new Map((existingRows ?? []).map((row) => [row.source_response_id, row]));
  const existingByUser = new Map((existingRows ?? []).filter((row) => row.user_id).map((row) => [row.user_id, row]));

  const payloads = rawRows.map((cells, index) => {
    const rowNumber = index + 2; const rawTimestamp = String(cells[0] ?? "").trim();
    const respondentEmail = normalizeEmail(cells[1]); const accountEmail = normalizeEmail(cells[9]);
    const fullName = String(cells[8] ?? "").trim(); const portrait = String(cells[10] ?? "").trim();
    const motors = String(cells[11] ?? "").split(/\s*;\s*|\n+/).map((item) => item.trim()).filter(Boolean);
    const heroes = [cells[2], cells[4], cells[6]].map((item) => String(item ?? "").trim()).filter((item) => item && !noneHero.test(item));
    const note = String(cells[12] ?? "").trim(); const readablePortrait = portrait.replace(/&nbsp;/gi, " ").replace(/<br\s*\/?\s*>/gi, "\n");
    const opening = readablePortrait.match(/^Moi,\s*([^,]+),\s*je suis(?:…|\.\.\.)?/i);
    const refused = !!note || ["non", "no", "c est confidentiel"].includes(normalizedText(fullName)) || normalizedText(readablePortrait).startsWith("tu as choisi de garder tes reponses au test des heros confidentielles");
    const firstName = opening?.[1].trim() || fullName.split(/\s+/)[0] || "";
    const sourceResponseId = `heroes-form-${hash([rawTimestamp, respondentEmail, accountEmail, fullName].join("|")).slice(0, 32)}`;
    const anomalies: string[] = [];
    if (!validEmail(accountEmail)) anomalies.push("invalid_account_email");
    if (!refused && !opening) anomalies.push("unexpected_portrait_opening");
    if (!refused && opening && fullName) { const portraitName = normalizedText(opening[1]); const normalizedName = normalizedText(fullName); const tokens = normalizedName.split(" "); if (!normalizedName.includes(portraitName) && !tokens.some((token) => portraitName.includes(token)) && verifiedPortraitNames.get(accountEmail) !== portraitName) anomalies.push("portrait_name_mismatch"); }
    let userId: string | null = null; let assignmentStatus = "unassigned";
    const accountMatches = validEmail(accountEmail) ? accountsByEmail.get(accountEmail) ?? [] : [];
    if (accountMatches.length === 1) { userId = accountMatches[0].user_id; assignmentStatus = "assigned"; }
    else if (accountMatches.length > 1) { assignmentStatus = "anomaly"; anomalies.push("multiple_accounts"); }
    else if (validEmail(accountEmail)) anomalies.push("account_not_found");
    const occupied = userId ? existingByUser.get(userId) : null;
    if (occupied && occupied.source_response_id !== sourceResponseId) { userId = null; assignmentStatus = "anomaly"; anomalies.push("existing_result_for_account"); }
    const previous = existingBySource.get(sourceResponseId);
    return {
      previous,
      row: {
        user_id: userId, source_response_id: sourceResponseId, source_email: accountEmail || respondentEmail || null,
        first_name: firstName, portrait: portrait || null, motors, heroes,
        source_payload: Object.fromEntries(header.map((label, column) => [`${column + 1}:${label}`, cells[column] ?? ""])),
        communication_status: refused ? "refused" : "authorized", visible: false,
        assignment_status: assignmentStatus, anomalies: [...new Set(anomalies)], source_submitted_at: submittedAt(rawTimestamp),
        source_file_hash: APPROVED_SOURCE_HASH, validation_status: anomalies.length ? "pending" : "validated",
        publication_status: "draft", published_at: null, last_modified_by: viewer.id,
      },
      rowNumber,
    };
  });

  let inserted = 0; let updated = 0; let preserved = 0;
  for (let offset = 0; offset < payloads.length; offset += 40) {
    const batch = payloads.slice(offset, offset + 40).filter((item) => { if (item.previous?.publication_status === "published") { preserved += 1; return false; } return true; });
    if (!batch.length) continue;
    const { data: saved, error } = await supabase.from("heroes_motors_results").upsert(batch.map((item) => item.row), { onConflict: "source_response_id" }).select("id,source_response_id");
    if (error) throw new Error(`Import interrompu près de la ligne ${batch[0].rowNumber} : ${error.message}`);
    inserted += batch.filter((item) => !item.previous).length; updated += batch.filter((item) => !!item.previous).length;
    const bySource = new Map(batch.map((item) => [item.row.source_response_id, item]));
    const audits = (saved ?? []).map((savedRow) => { const item = bySource.get(savedRow.source_response_id)!; return { result_id: savedRow.id, actor_id: viewer.id, action: item.previous ? "update" : "insert", changed_fields: ["csv_import"], previous_value: item.previous ? { source_response_id: item.previous.source_response_id } : null, next_value: { source_response_id: savedRow.source_response_id, source_file_hash: APPROVED_SOURCE_HASH } }; });
    if (audits.length) { const { error: auditError } = await supabase.from("heroes_motors_result_audit").insert(audits); if (auditError) throw new Error(`Import effectué mais journalisation interrompue : ${auditError.message}`); }
  }
  revalidatePath("/admin/apps/test-des-heros/results");
  redirect(`/admin/apps/test-des-heros/results?imported=${inserted}&updated=${updated}&preserved=${preserved}`);
}

export async function saveHeroesResult(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer?.roles.superAdmin || viewer.deactivated) throw new Error("Accès refusé.");
  const id = value(formData, "id", 100); const userId = value(formData, "userId", 100) || null;
  const communication = value(formData, "communication", 20);
  if (!['authorized', 'refused'].includes(communication)) throw new Error("Statut de communication invalide.");
  const portrait = value(formData, "portrait"); const motors = lines(formData, "motors"); const heroes = lines(formData, "heroes").slice(0, 3);
  if (communication === "authorized" && (!portrait || !motors.length || heroes.length < 2)) throw new Error("Le portrait, les moteurs et au moins deux héros sont requis.");
  const visible = formData.get("visible") === "on";
  const supabase = await createClient();
  const { data: current, error: currentError } = id ? await supabase.from("heroes_motors_results").select("*").eq("id", id).single() : { data: null, error: null };
  if (currentError) throw new Error(`Résultat introuvable : ${currentError.message}`);
  if (current?.user_id && current.user_id !== userId && formData.get("confirmReassignment") !== "on") throw new Error("Confirmez le changement d’attribution.");
  const { data: accounts, error: accountError } = await supabase.rpc("heroes_motors_admin_accounts");
  if (accountError) throw new Error(accountError.message);
  const account = (accounts ?? []).find((item: { user_id: string }) => item.user_id === userId);
  const payload = {
    user_id: userId, source_email: account?.email ?? current?.source_email ?? null,
    first_name: value(formData, "firstName", 120) || account?.full_name?.split(/\s+/)[0] || current?.first_name || "",
    portrait: portrait || null, motors, heroes, communication_status: communication,
    visible, assignment_status: userId ? "assigned" : "unassigned", anomalies: [],
    validation_status: "validated", publication_status: visible ? "published" : "draft",
    published_at: visible ? (current?.published_at ?? new Date().toISOString()) : null,
    last_modified_by: viewer.id,
  };
  const mutation = id ? supabase.from("heroes_motors_results").update(payload).eq("id", id) : supabase.from("heroes_motors_results").insert({ ...payload, source_response_id: `manual-${crypto.randomUUID()}`, source_payload: {} });
  const { data: saved, error } = await mutation.select("id").single();
  if (error) throw new Error(`Enregistrement impossible : ${error.message}`);
  const changed = current ? Object.keys(payload).filter((key) => JSON.stringify(current[key]) !== JSON.stringify(payload[key as keyof typeof payload])) : Object.keys(payload);
  const { error: auditError } = await supabase.from("heroes_motors_result_audit").insert({ result_id: saved.id, actor_id: viewer.id, action: current ? (current.user_id !== userId ? "assignment" : "update") : "insert", changed_fields: changed, previous_value: current, next_value: payload });
  if (auditError) throw new Error(`Résultat enregistré mais journalisation impossible : ${auditError.message}`);
  revalidatePath("/admin/apps/test-des-heros/results"); revalidatePath("/etudiant/identite"); revalidatePath("/etudiant/identite/mes-moteurs");
  redirect("/admin/apps/test-des-heros/results?saved=1");
}
