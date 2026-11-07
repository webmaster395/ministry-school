import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Mon identité reste privée et s'ouvre aux étudiants à 07h00 Paris", () => {
  const nav = read("src/lib/nav.tsx");
  const navBlocks = read("src/components/NavBlocks.tsx");
  const page = read("src/app/etudiant/identite/page.tsx");
  const proxy = read("src/proxy.ts");

  assert.equal((nav.match(/label: "Mon identité"/g) ?? []).length, 1);
  assert.match(nav, /href: "\/etudiant\/identite"/);
  assert.doesNotMatch(nav, /label: "Mes ressources"/);
  assert.match(navBlocks, /item\.label !== "Mon identité" \|\| isSuperAdmin \|\| toolsVisible/);
  assert.match(page, /if \(!viewer\) redirect\("\/login"\)/);
  assert.match(page, /!viewer\.roles\.superAdmin && !isMappGuestOpen\(\)/);
  assert.match(proxy, /isDevelopmentPreview[\s\S]*process\.env\.VERCEL_ENV !== "production"/);
  assert.match(proxy, /request\.nextUrl\.pathname === "\/apps"/);
  assert.doesNotMatch(proxy, /isPublicPage[\s\S]*request\.nextUrl\.pathname === "\/etudiant\/identite"/);
});

test("le tableau de bord privé consolide ses lectures et ne rapproche jamais par e-mail", () => {
  const migration = read("supabase/migrations/20261106120000_student_identity_dashboard.sql");
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /participant_auth_identities[\s\S]*auth_user_id = current_user_id/);
  assert.doesNotMatch(migration, /where[^;]*email\s*=/i);
  assert.match(migration, /attempt\.status = 'completed'/);
  assert.match(migration, /assessment\.completed_at is not null/);
  assert.match(migration, /revoke all on function public\.student_identity_dashboard\(\) from public, anon/);
  assert.match(migration, /grant execute on function public\.student_identity_dashboard\(\) to authenticated/);
});

test("la page reprend le profil, les stories, les onglets et les résultats réels", () => {
  const page = read("src/app/etudiant/identite/page.tsx");
  const experience = read("src/app/etudiant/identite/IdentityExperience.tsx");

  assert.match(page, /fullName=\{viewer\.fullName/);
  assert.match(page, /status=\{accountStatus\(viewer\.role/);
  assert.match(page, /buildStories\(tools\)/);
  assert.doesNotMatch(page, /key: "recommendations"/);
  assert.match(page, /buildUpcoming\(tools, completedKinds\)/);
  assert.doesNotMatch(page, /seenKinds/);
  assert.match(page, /results=\{allResults\}/);
  assert.match(experience, /Mes résultats/);
  assert.match(experience, /À venir/);
  assert.match(experience, /props\.stories\.map/);
  assert.match(experience, /Les résultats apparaîtront après la finalisation d’un test/);
  assert.match(experience, /result\.attemptId[\s\S]*\/apps\/profil-mapp\/test\/\$\{result\.attemptId\}\/resultat/);
  assert.match(experience, /competences-naturelles\.webp/);
  assert.match(experience, /dons-spirituels\.webp/);
  assert.match(experience, /generopoly\.webp/);
  assert.match(experience, /\?test=fruit/);
  assert.match(experience, /\?test=gifts/);
  assert.match(experience, /\?test=skills/);
  assert.doesNotMatch(experience, /Certifié/);
  assert.doesNotMatch(experience, /Retrouve les réponses et résultats enregistrés par l’outil/);
});

test("la grille Instagram conserve trois colonnes sur ordinateur et téléphone", () => {
  const css = read("src/app/etudiant/identite/identity.module.css");
  assert.match(css, /\.grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(3,/);
  assert.doesNotMatch(css, /grid-template-columns:\s*repeat\(2,/);
  assert.match(css, /var\(--foreground\)/);
  assert.match(css, /var\(--surface\)/);
  assert.match(css, /var\(--accent\)/);
});

test("le genre est ajouté à la lecture consolidée sans requête supplémentaire", () => {
  const migration = read("supabase/migrations/20261106130000_student_identity_profile_gender.sql");
  assert.match(migration, /'gender',current_profile\.gender/);
  assert.match(migration, /participant_auth_identities[\s\S]*auth_user_id\s*=\s*current_user_id/);
  assert.doesNotMatch(migration, /where[^;]*email\s*=/i);
});

test("les pages de résultats permettent un retour direct vers Mon identité", () => {
  const mapp = read("src/app/apps/profil-mapp/MappNativeExperience.tsx");
  const grace = read("src/components/apps/GraceIdentityTool.tsx");
  assert.match(mapp, /href="\/etudiant\/identite"[^>]*>← Mon identité/);
  assert.match(grace, /href="\/etudiant\/identite"/);
});

test("les cartes MAPP utilisent la couleur et le personnage officiels de chaque profil", () => {
  const identity = read("src/app/etudiant/identite/IdentityExperience.tsx");
  assert.match(identity, /D: "\/apps\/profil-mapp\/images\/profile-cards\/paul-hero-hd-v2\.webp"/);
  assert.match(identity, /I: "\/apps\/profil-mapp\/images\/profile-cards\/pierre-hero-hd-v2\.webp"/);
  assert.match(identity, /S: "\/apps\/profil-mapp\/images\/profile-cards\/abraham-hero-hd-v2\.webp"/);
  assert.match(identity, /C: "\/apps\/profil-mapp\/images\/profile-cards\/moise-hero-hd-v2\.webp"/);
});

test("Mon identité affiche seulement le prénom dans un titre plus discret", () => {
  const identity = read("src/app/etudiant/identite/IdentityExperience.tsx");
  const styles = read("src/app/etudiant/identite/identity.module.css");
  assert.match(identity, /const firstName = nameParts\[0\]/);
  assert.match(identity, /<h1>\{firstName\}<\/h1>/);
  assert.match(styles, /font-size: clamp\(27px, 3\.4vw, 36px\)/);
});

test("les stories MAPP et Généropoly restent visibles avec leurs bons liens", () => {
  const page = read("src/app/etudiant/identite/page.tsx");
  assert.match(page, /name: "Profil MAPP", href: "\/apps\/profil-mapp"/);
  assert.match(page, /name: "Généropoly", href: "\/apps\/generopoly"/);
  assert.match(page, /image: "\/identity\/stories\/identity-v2\.webp"/);
  assert.match(page, /image: "\/identity\/stories\/finance-v2\.webp"/);
});
