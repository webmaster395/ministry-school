import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20261005170000_private_course_notes.sql",
    import.meta.url,
  ),
  "utf8",
);
const actions = readFileSync(
  new URL("../src/app/etudiant/notes/actions.ts", import.meta.url),
  "utf8",
);

test("les notes sont uniques par étudiant et par séance", () => {
  assert.match(migration, /unique\s*\(user_id,\s*session_id\)/i);
});

test("toutes les politiques RLS limitent les notes au propriétaire authentifié", () => {
  assert.match(migration, /enable row level security/i);
  assert.equal(
    (migration.match(/user_id\s*=\s*auth\.uid\(\)/g) ?? []).length >= 4,
    true,
  );
  assert.match(migration, /feature_key\s*=\s*'course_notes'/);
});

test("la sauvegarde rattache toujours la note à l’utilisateur connecté et à la séance", () => {
  assert.match(actions, /user_id:\s*user\.id/);
  assert.match(actions, /session_id:\s*sessionId/);
  assert.match(actions, /onConflict:\s*"user_id,session_id"/);
});
