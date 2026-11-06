import assert from "node:assert/strict";
import test from "node:test";
import { isMappGuestOpen, MAPP_GUEST_OPENS_AT } from "../src/lib/mapp/access-window.ts";

test("les invites restent bloques une milliseconde avant 07h00 Paris", () => {
  assert.equal(isMappGuestOpen(new Date("2026-11-07T05:59:59.999Z")), false);
});

test("les invites sont admis exactement a 07h00 Paris", () => {
  assert.equal(MAPP_GUEST_OPENS_AT.toISOString(), "2026-11-07T06:00:00.000Z");
  assert.equal(isMappGuestOpen(new Date("2026-11-07T06:00:00.000Z")), true);
});
