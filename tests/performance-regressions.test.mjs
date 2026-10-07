import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("la connexion arrive directement sur la Home sans refresh supplémentaire", () => {
  const login = read("src/app/login/page.tsx");
  assert.match(login, /router\.replace\("\/etudiant"\)/);
  assert.doesNotMatch(login, /router\.(?:push|replace)\("\/app"\)/);
  assert.doesNotMatch(login, /router\.refresh\(\)/);
});

test("claim_delegations est limité à la connexion", () => {
  const login = read("src/app/login/page.tsx");
  const viewer = read("src/lib/data/viewer.ts");
  assert.match(login, /rpc\("claim_delegations"\)/);
  assert.doesNotMatch(viewer, /claim_delegations/);
});

test("la Home réutilise le viewer et ne relit pas Auth ou le profil", () => {
  const home = read("src/app/etudiant/page.tsx");
  assert.match(home, /getViewer\(\)/);
  assert.match(home, /getStudentProgram\(/);
  assert.doesNotMatch(home, /auth\.getUser\(/);
  assert.doesNotMatch(home, /getStudentProfile\(/);
});

test("le cache partagé ne reçoit que les critères de parcours", () => {
  const studentData = read("src/lib/data/student.ts");
  assert.match(studentData, /getCachedProgramForProfile/);
  assert.match(studentData, /tags: \[STUDENT_PROGRAM_CACHE_TAG\]/);
  assert.match(studentData, /ministryId: string \| null,\s*preferredDay: string \| null/s);
  assert.doesNotMatch(studentData, /getCachedProgramForProfile\([^)]*userId/s);
});

test("le contexte viewer est consolidé par une RPC sous les RLS existantes", () => {
  const viewer = read("src/lib/data/viewer.ts");
  const migration = read("supabase/migrations/20261006120000_student_viewer_context.sql");
  assert.match(viewer, /rpc\("student_viewer_context"\)/);
  assert.match(migration, /security invoker/i);
  assert.match(migration, /where p\.id = \(select auth\.uid\(\)\)/i);
  assert.doesNotMatch(migration, /security definer/i);
});

test("le viewer vérifie le JWT localement sans appeler Auth /user", () => {
  const viewer = read("src/lib/data/viewer.ts");
  assert.match(viewer, /auth\.getClaims\(\)/);
  assert.doesNotMatch(viewer, /auth\.getUser\(\)/);
  assert.match(viewer, /auth\.claims\.sub/);
});

test("seuls les trois index critiques à faible risque sont préparés", () => {
  const migration = read("supabase/migrations/20261006130000_critical_student_path_indexes.sql");
  assert.match(migration, /assignments \(session_id, sort_order, created_at desc\)/i);
  assert.match(migration, /materials \(session_id, visible_at, sort_order\)/i);
  assert.match(migration, /assignment_completions \(user_id, assignment_id\)/i);
  assert.doesNotMatch(migration, /policy|alter table|drop /i);
});

test("les comptes de charge sont marqués et exclus des agrégations réelles", () => {
  const migration = read("supabase/migrations/20261006150000_isolate_load_test_accounts.sql");
  const admin = read("src/lib/data/admin.ts");
  const hub = read("src/lib/data/admin-hub.ts");
  const search = read("src/app/gestion/actions.ts");
  assert.match(migration, /is_test_account boolean not null default false/);
  assert.match(migration, /test_batch_id uuid/);
  assert.match(migration, /profiles_test_account_batch_check/);
  assert.match(admin, /eq\("is_test_account", false\)/);
  assert.match(hub, /eq\("is_test_account", false\)/);
  assert.match(search, /eq\("is_test_account", false\)/);
});
