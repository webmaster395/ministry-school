import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const migrationDirectory = new URL("../supabase/migrations/", import.meta.url);
const overlayUrl = new URL("../supabase/migrations/20261106110000_native_mapp_ministry_access_and_batching.sql", import.meta.url);

async function portedSql() {
  const files = (await readdir(migrationDirectory))
    .filter((name) => name.includes("_mapp_port_") && name.endsWith(".sql"))
    .sort();
  return Promise.all(files.map((name) => readFile(new URL(name, migrationDirectory), "utf8")));
}

test("les 24 migrations MAPP sont portées dans un schéma isolé", async () => {
  const migrations = await portedSql();
  assert.equal(migrations.length, 24);
  const sql = migrations.join("\n");
  assert.match(sql, /create schema if not exists mapp/i);
  assert.match(sql, /create table mapp\.questions/i);
  assert.match(sql, /create table mapp\.profiles/i);
  assert.match(sql, /create or replace function mapp\.finalize_attempt/i);
  assert.doesNotMatch(sql, /https:\/\/[^\s']+\.supabase\.co/i);
  assert.doesNotMatch(sql, /create table public\.(questions|profiles)/i);
  assert.doesNotMatch(sql, /all tables in schema public/i);
});

test("seul un étudiant Ministry actif et confirmé est éligible", async () => {
  const sql = await readFile(overlayUrl, "utf8");
  const eligibility = sql.slice(
    sql.indexOf("create or replace function mapp.current_student_is_eligible"),
    sql.indexOf("create or replace function mapp.open_native_questionnaire"),
  );
  assert.match(eligibility, /profile\.id = \(select auth\.uid\(\)\)/i);
  assert.match(eligibility, /profile\.role = 'student'/i);
  assert.match(eligibility, /profile\.email_confirmed/i);
  assert.match(eligibility, /not coalesce\(profile\.deactivated, false\)/i);
  assert.doesNotMatch(eligibility, /where .*email\s*=/i);
});

test("l'ouverture native consolide identité, tentative, questions et réponses", async () => {
  const sql = await readFile(overlayUrl, "utf8");
  assert.match(sql, /create or replace function mapp\.open_native_questionnaire/i);
  assert.match(sql, /identity_link\.auth_user_id = current_user/i);
  assert.match(sql, /'questions'.*jsonb_agg/is);
  assert.match(sql, /'answers'.*jsonb_agg/is);
  assert.match(sql, /pg_advisory_xact_lock/i);
  assert.match(sql, /create or replace function public\.mapp_open_questionnaire\(\)/i);
  assert.match(sql, /grant execute on function public\.mapp_open_questionnaire\(\) to authenticated/i);
  assert.match(sql, /revoke all on function mapp\.open_native_questionnaire\(\) from public, anon, authenticated/i);
});

test("la sauvegarde accepte au plus cinq réponses et protège les courses", async () => {
  const sql = await readFile(overlayUrl, "utf8");
  assert.match(sql, /answer_count < 1 or answer_count > 5/i);
  assert.match(sql, /primary key \(attempt_id, mutation_id\)/i);
  assert.match(sql, /for update/i);
  assert.match(sql, /MAPP_REVISION_CONFLICT/i);
  assert.match(sql, /on conflict \(attempt_id, question_id\) do update/i);
  assert.match(sql, /mapp\.attempt_answers\.client_sequence <= excluded\.client_sequence/i);
});

test("les anciens chemins à une écriture par réponse sont retirés au navigateur", async () => {
  const sql = await readFile(overlayUrl, "utf8");
  assert.match(sql, /revoke all on function mapp\.start_session_attempt\(text, jsonb, boolean\) from authenticated/i);
  assert.match(sql, /revoke all on function mapp\.save_attempt_answer\(uuid, uuid, integer, bigint\) from authenticated/i);
  assert.match(sql, /grant execute on function public\.mapp_save_answer_batch\(uuid, uuid, integer, bigint, jsonb\) to authenticated/i);
});

test("la finalisation conserve le calcul officiel et consolide le résultat", async () => {
  const sql = await readFile(overlayUrl, "utf8");
  assert.match(sql, /result_revision_id := mapp\.finalize_attempt\(p_attempt_id\)/i);
  assert.match(sql, /mapp\.get_native_results_bundle\(p_attempt_id\)/i);
  assert.match(sql, /attempt\.status = 'completed'/i);
  assert.match(sql, /mapp_private\.owns_participant\(attempt\.participant_id\)/i);
});

test("le départage natif applique les trois questions officielles sans modifier les scores", async () => {
  const sql = await readFile(overlayUrl, "utf8");
  assert.match(sql, /mapp\.submit_native_tie_break/);
  assert.match(sql, /'tie-01', 'tie-02', 'tie-03'/);
  assert.match(sql, /'mapp-v10-tie-break-v1'/);
  assert.match(sql, /MAPP_TIE_BREAK_INVALID/);
  assert.match(sql, /on conflict \(result_revision_id\) do nothing/);
  assert.doesNotMatch(sql.slice(sql.indexOf("create or replace function mapp.submit_native_tie_break")), /update mapp\.result_dimension_scores/);
});
