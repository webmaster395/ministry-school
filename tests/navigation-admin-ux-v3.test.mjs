import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("la navigation étudiante suit l’ordre demandé avec Ma personnalité", async () => {
  const nav = await source("src/lib/nav.tsx");
  const student = nav.slice(nav.indexOf("export const studentSections"), nav.indexOf("export const notesNavItem"));
  const expected = ["Accueil", "Ma personnalité", "Mon ministère", "Mes cours", "Travail à faire", "Mes ressources", "Projets et formations"];
  let cursor = -1;
  for (const label of expected) {
    const position = student.indexOf(`label: "${label}"`);
    assert.ok(position > cursor, `${label} doit apparaître dans le bon ordre`);
    cursor = position;
  }
  assert.match(student, /title: "Qui je suis"/);
  assert.match(student, /title: "Mon parcours"/);
  assert.doesNotMatch(student, /label: "Mon espace"/);
});

test("l’espace Admin est réservé aux super admins et réduit à quatre entrées", async () => {
  const [nav, layout] = await Promise.all([
    source("src/lib/nav.tsx"),
    source("src/app/gestion/admin/layout.tsx"),
  ]);
  const admin = nav.slice(nav.indexOf('if (roles.superAdmin)'), nav.indexOf('key: "steering"'));
  for (const label of ["Pilotage", "Membres", "Cours", "Projets et formations"]) {
    assert.match(admin, new RegExp(`label: "${label}"`));
  }
  assert.doesNotMatch(admin, /label: "Permissions"|label: "À valider"|label: "Sensibilités ministérielles"/);
  assert.match(layout, /if \(!viewer\?\.roles\.superAdmin\) redirect\("\/etudiant"\)/);
});

test("permissions, validations et cursus sont intégrés à leurs pages parentes", async () => {
  const [adminPage, courses, projects] = await Promise.all([
    source("src/app/gestion/admin/page.tsx"),
    source("src/app/gestion/admin/cours-formations/page.tsx"),
    source("src/app/gestion/projets-formations/page.tsx"),
  ]);
  assert.match(adminPage, /vue=permissions/);
  assert.match(adminPage, /embedded/);
  for (const label of ["Formation du cœur", "Formation du caractère", "apotre", "prophete", "evangeliste", "pasteur", "docteur"]) {
    assert.match(courses, new RegExp(label));
  }
  assert.match(projects, /vue === "validation"/);
  assert.match(projects, /ValidationQueueContent/);
  assert.match(projects, /bg-\[#C43D32\]/);
});

test("la fiche membre montre MAPP et confirme clairement les enregistrements", async () => {
  const [member, editor] = await Promise.all([
    source("src/app/gestion/admin/membres/[id]/page.tsx"),
    source("src/components/admin/MemberAccessEditor.tsx"),
  ]);
  assert.match(member, /PROFIL MAPP/);
  assert.match(member, /Profil principal/);
  assert.match(member, /Profil secondaire/);
  assert.match(member, /participant_auth_identities/);
  assert.match(editor, /Modifications non enregistrées/);
  assert.match(editor, /Enregistrement en cours/);
  assert.match(editor, /Enregistré à/);
});
