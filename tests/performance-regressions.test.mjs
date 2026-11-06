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

test("une soumission de connexion ne peut produire qu'un seul appel token", () => {
  const login = read("src/app/login/page.tsx");
  assert.match(login, /submitInFlight = useRef\(false\)/);
  assert.match(login, /if \(submitInFlight\.current \|\| retryBlocked\) return/);
  assert.match(login, /submitInFlight\.current = true/);
  assert.equal((login.match(/signInWithPassword/g) ?? []).length, 1);
  assert.match(login, /isLoginRateLimited\(signInError\)/);
  assert.doesNotMatch(login, /refreshSession|setInterval\([^)]*signInWithPassword/);
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

test("le burst de connexion utilise les index de délégation et les fast paths étudiant", () => {
  const migration = read("supabase/migrations/20261102090000_login_burst_hardening.sql");
  assert.match(migration, /ministry_delegates_pending_email_idx/);
  assert.match(migration, /ministry_delegates_user_scope_idx/);
  assert.match(migration, /opportunity_assignments_user_scope_idx/);
  assert.match(migration, /auth\.jwt\(\)\s*->>\s*'email'/);
  assert.match(migration, /when viewer\.ministry_lead_of is null and not viewer\.has_delegation/);
  assert.match(migration, /when not viewer\.can_create_opportunities and not viewer\.is_projects_training_member/);
  assert.match(migration, /drop trigger if exists capture_monthly_sign_in on auth\.users/);
  assert.match(migration, /p_record_sign_in boolean default false/);
  assert.match(migration, /recorded_student_auth_sessions/);
  assert.match(migration, /on conflict \(session_id\) do nothing/);
});

test("les statistiques de connexion sont différées hors de la transaction Auth", () => {
  const login = read("src/app/login/page.tsx");
  const tracker = read("src/components/StudentUsageTracker.tsx");
  assert.match(login, /sessionStorage\.setItem\("ms:just-signed-in", "1"\)/);
  assert.match(tracker, /p_record_sign_in: recordSignIn/);
  assert.match(tracker, /15_000 \+ Math\.random\(\) \* 60_000/);
});

test("les lectures globales du premier écran sont mutualisées", () => {
  const catalog = read("src/lib/apps/catalog.ts");
  const student = read("src/lib/data/student.ts");
  const home = read("src/app/etudiant/page.tsx");
  assert.match(catalog, /getCachedStudentToolsEnabled = unstable_cache/);
  assert.match(catalog, /STUDENT_TOOLS_SETTINGS_CACHE_TAG/);
  assert.match(student, /getCachedStudentAssignments = unstable_cache/);
  assert.match(home, /getStudentProgramAssignments\(/);
  assert.doesNotMatch(home, /getStudentAssignments\(/);
});

test("le générateur de charge refuse explicitement la production", () => {
  const loadTest = read("scripts/load-test-login.mjs");
  const accounts = read("scripts/load-test-accounts.mjs");
  assert.match(loadTest, /LOAD_TEST_AUTHORIZED/);
  assert.match(loadTest, /PRODUCTION_PROJECT_REF/);
  assert.match(loadTest, /PRODUCTION_HOSTS/);
  assert.match(loadTest, /\[50, 100, 200, 400, 500\]/);
  assert.match(accounts, /create-batch/);
  assert.match(accounts, /LOAD_TEST_AUTHORIZED/);
  assert.match(accounts, /création de comptes de charge est interdite sur le projet Supabase de production/);
  assert.match(accounts, /await writeManifest\(manifest\)/);
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
