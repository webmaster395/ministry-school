import test from "node:test";
import assert from "node:assert/strict";
import {
  isLoginRateLimited,
  loginErrorMessage,
  normalizeLoginEmail,
} from "../src/lib/auth/login-errors.ts";

test("normalise l'e-mail avant l'unique tentative Auth", () => {
  assert.equal(normalizeLoginEmail("  Alice.Exemple@Example.COM "), "alice.exemple@example.com");
});

test("reconnaît les réponses 429 sans dépendre du texte fournisseur", () => {
  assert.equal(isLoginRateLimited({ status: 429 }), true);
  assert.equal(isLoginRateLimited({ code: "over_request_rate_limit" }), true);
  assert.equal(isLoginRateLimited({ status: 401, code: "invalid_credentials" }), false);
  assert.match(loginErrorMessage({ status: 429 }), /pas été relancée automatiquement/);
});

test("distingue compte désactivé, e-mail non confirmé et identifiants invalides", () => {
  assert.match(loginErrorMessage({ message: "User is banned" }), /désactivé/);
  assert.match(loginErrorMessage({ code: "email_not_confirmed" }), /Validez votre adresse/);
  assert.match(loginErrorMessage({ code: "invalid_credentials" }), /Identifiants incorrects/);
});

test("une panne serveur ou réseau n'encourage pas une boucle de reconnexion", () => {
  assert.match(loginErrorMessage({ status: 503 }), /n’a pas été répétée automatiquement/);
  assert.match(loginErrorMessage(new TypeError("fetch failed")), /Aucune nouvelle tentative/);
});
