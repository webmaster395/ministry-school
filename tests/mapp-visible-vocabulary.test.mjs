import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("le vocabulaire public du Profil MAPP utilise toujours les noms officiels", () => {
  const helper = read("src/lib/mapp/visible-profile.ts");
  assert.match(helper, /D: "Conquérant"/);
  assert.match(helper, /I: "Communicant"/);
  assert.match(helper, /S: "Facilitateur"/);
  assert.match(helper, /C: "Analyste"/);
  assert.match(helper, /replace\(\/\\bDISC/);
  assert.match(helper, /replace\(\/\\bCommuniquant/);
});

test("les résultats, fiches membres et PDF passent par le vocabulaire visible MAPP", () => {
  const identity = read("src/app/etudiant/identite/IdentityExperience.tsx");
  const member = read("src/app/gestion/admin/membres/[id]/page.tsx");
  const pdf = read("src/lib/mapp/pdf-landscape.ts");
  const result = read("src/app/preview/resultat/complete-experience.tsx");

  assert.match(identity, /visibleMappProfileName\(result\.primaryCode/);
  assert.doesNotMatch(identity, /\?\? result\.primaryCode/);
  assert.doesNotMatch(member, /\?\? .*primary_code/);
  assert.match(pdf, /normalizeVisibleMappText/);
  assert.match(result, /normalizeVisibleMappVocabulary/);
  assert.match(result, /\.combination-symbols \[title\]/);
});

test("les invitations publiques restent sous la marque MAPP", () => {
  const invitations = read("src/lib/mapp/invitations.ts");
  const guestEntry = read("src/app/apps/profil-mapp/GuestMappEntry.tsx");
  assert.match(invitations, /mapp\/invitation/);
  assert.doesNotMatch(guestEntry, />[^<]*DISC/i);
});
