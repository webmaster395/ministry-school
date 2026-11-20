import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("../supabase/migrations/20261111211500_mapp_pending_historical_result_claims.sql", import.meta.url),
  "utf8",
);

test("les résultats MAPP historiques attendent une adresse exacte et restent privés", () => {
  assert.match(migration, /normalized_email text generated always as \(lower\(btrim\(email\)\)\) stored/);
  assert.match(migration, /unique \(normalized_email\)/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on table mapp\.pending_historical_result_claims from public, anon, authenticated/);
});

test("la création du compte rattache le participant en attente sans écraser un autre MAPP", () => {
  assert.match(migration, /claim\.normalized_email = lower\(btrim\(target_email\)\)/);
  assert.match(migration, /existing_identity\.participant_id <> pending_claim\.participant_id/);
  assert.match(migration, /Le compte possède déjà un participant MAPP différent/);
  assert.match(migration, /insert into mapp\.participant_auth_identities/);
  assert.match(migration, /set claimed_at = now\(\),[\s\S]*?claimed_by = target_user_id/);
});

test("le rattachement se déclenche à la création du compte ou au changement d'adresse", () => {
  assert.match(migration, /create trigger claim_pending_mapp_results/);
  assert.match(migration, /after insert or update of email on auth\.users/);
  assert.match(migration, /claim_pending_historical_results_on_auth_user\(\)/);
});
