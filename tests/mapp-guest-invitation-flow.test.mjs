import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("le middleware laisse passer toutes les écritures sécurisées du questionnaire invité", () => {
  const proxy = read("src/proxy.ts");
  for (const path of [
    "/api/mapp/attempts/",
    "/api/mapp/hybrid-44/attempts/",
    "/api/mapp/hybrid-44/results/",
    "/api/mapp/results/",
  ]) assert.match(proxy, new RegExp(path.replaceAll("/", "\\/")));
});

test("le document statique de restitution reste accessible aux invités", () => {
  const proxy = read("src/proxy.ts");
  assert.match(proxy, /html\?/);
  assert.equal(fs.existsSync(new URL("../public/apps/profil-mapp/preview/profil-mapp-complet.html", import.meta.url)), true);
});

test("une invitation commencée reprend automatiquement la tentative possédée", () => {
  const page = read("src/app/mapp/invitation/[token]/page.tsx");
  const invitations = read("src/lib/mapp/invitations.ts");
  assert.match(page, /guestOwnsAttempt\(invitation\.attemptId\)/);
  assert.match(page, /redirect\(invitation\.attemptStatus === "completed"/);
  assert.match(invitations, /select\("attempt_id"\)/);
});

test("les étapes invitées utilisent la sauvegarde atomique protégée par le secret", () => {
  const route = read("src/app/api/mapp/attempts/[attemptId]/answers/route.ts");
  assert.match(route, /rpc\("save_guest_hybrid_step", args\)/);
  assert.match(route, /p_token_hash: tokenHash/);
});
