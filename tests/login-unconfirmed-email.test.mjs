import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const login = readFileSync(new URL("../src/app/login/page.tsx", import.meta.url), "utf8");
const messages = readFileSync(new URL("../src/lib/auth/login-errors.ts", import.meta.url), "utf8");

test("la connexion avec une adresse non validée affiche un message dédié", () => {
  assert.match(login, /loginErrorMessage\(signInError\)/);
  assert.match(messages, /email_not_confirmed/);
  assert.match(messages, /Validez votre adresse e-mail pour pouvoir vous connecter\. Un lien vous a été envoyé par e-mail : pensez à vérifier vos courriers indésirables\./);
});

test("les identifiants incorrects gardent leur message habituel", () => {
  assert.match(messages, /Identifiants incorrects\. Vérifiez votre e-mail et votre mot de passe\./);
});
