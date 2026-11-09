import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Profil MAPP exige une connexion Ministry et conserve la destination après connexion", () => {
  const proxy = read("src/proxy.ts");
  const login = read("src/app/login/page.tsx");
  assert.doesNotMatch(proxy, /isProfilMappRoute|startsWith\("\/apps\/profil-mapp"\)/);
  assert.match(proxy, /url\.searchParams\.set\("next", next\)/);
  assert.match(login, /requestedNext\?\.startsWith\("\/"\)/);
  assert.match(login, /router\.replace\(nextPath\)/);
});
