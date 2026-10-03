import test from "node:test";
import assert from "node:assert/strict";
import {
  MEMBER_REGISTRATION_TIME_ZONE,
  MEMBER_REGISTRATION_URLS,
  getMemberRegistrationUrl,
  getNextMemberRegistrationSwitch,
} from "../src/lib/member-registration-url.mjs";

test("utilise explicitement le fuseau Europe/Paris", () => {
  assert.equal(MEMBER_REGISTRATION_TIME_ZONE, "Europe/Paris");
});

test("conserve le lien octobre jusqu'au 3 octobre 2026 à 11h59:59, heure de Paris", () => {
  assert.equal(getMemberRegistrationUrl("2026-10-03T11:59:59+02:00"), MEMBER_REGISTRATION_URLS.october);
  assert.equal(getMemberRegistrationUrl("2026-10-03T11:59:59.999+02:00"), MEMBER_REGISTRATION_URLS.october);
});

test("bascule vers le lien novembre exactement le 3 octobre 2026 à 12h00, heure de Paris", () => {
  assert.equal(getMemberRegistrationUrl("2026-10-03T12:00:00+02:00"), MEMBER_REGISTRATION_URLS.november);
  assert.equal(getMemberRegistrationUrl("2026-10-03T10:00:00Z"), MEMBER_REGISTRATION_URLS.november);
});

test("conserve le lien novembre jusqu'au 7 octobre 2026 à 11h59:59, heure de Paris", () => {
  assert.equal(getMemberRegistrationUrl("2026-10-07T11:59:59+02:00"), MEMBER_REGISTRATION_URLS.november);
  assert.equal(getMemberRegistrationUrl("2026-10-07T11:59:59.999+02:00"), MEMBER_REGISTRATION_URLS.november);
});

test("bascule vers le lien décembre exactement le 7 octobre 2026 à 12h00, heure de Paris", () => {
  assert.equal(getMemberRegistrationUrl("2026-10-07T12:00:00+02:00"), MEMBER_REGISTRATION_URLS.december);
});

test("indique la prochaine bascule pour actualiser automatiquement une page ouverte", () => {
  assert.equal(getNextMemberRegistrationSwitch("2026-10-01T12:00:00+02:00")?.toISOString(), "2026-10-03T10:00:00.000Z");
  assert.equal(getNextMemberRegistrationSwitch("2026-10-03T12:00:00+02:00")?.toISOString(), "2026-10-07T10:00:00.000Z");
  assert.equal(getNextMemberRegistrationSwitch("2026-10-07T12:00:00+02:00"), null);
});
