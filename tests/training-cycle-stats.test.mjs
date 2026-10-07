import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { accountsByTrainingCycle } from "../src/lib/training-cycle-stats.ts";

const source = readFileSync(new URL("../src/lib/training-cycle-stats.ts", import.meta.url), "utf8");
const adminPage = readFileSync(new URL("../src/app/gestion/admin/page.tsx", import.meta.url), "utf8");

test("les inscriptions utilisent les journées réelles stockées dans sessions", () => {
  assert.match(adminPage, /getTrainingDayDates\(supabase\)/);
  assert.match(source, /created <= date && \(!previous \|\| created > previous\)/);
  assert.doesNotMatch(source, /programDates/);
});

test("chaque cycle est borné après la journée précédente et inclut sa journée de formation", () => {
  const accounts = [
    { created_at: "2026-09-15T10:00:00Z" },
    { created_at: "2026-10-03T21:59:00Z" }, // 3 octobre à 23 h 59 à Paris
    { created_at: "2026-10-03T22:01:00Z" }, // 4 octobre à 00 h 01 à Paris
    { created_at: "2026-11-07T22:59:00Z" }, // 7 novembre à 23 h 59 à Paris
    { created_at: "2026-11-07T23:01:00Z" }, // 8 novembre à 00 h 01 à Paris
    { created_at: "2026-12-05T22:59:00Z" },
    { created_at: "2026-12-05T23:01:00Z" }, // après le dernier cycle connu
  ];
  const result = accountsByTrainingCycle(accounts, ["2026-12-05", "2026-10-03", "2026-11-07", "2026-11-07"]);
  assert.deepEqual(result.map(({ date, label, value }) => ({ date, label, value })), [
    { date: "2026-10-03", label: "octobre", value: 2 },
    { date: "2026-11-07", label: "novembre", value: 2 },
    { date: "2026-12-05", label: "décembre", value: 2 },
  ]);
});

test("le calcul est explicitement réalisé dans le fuseau de Paris", () => {
  assert.match(source, /Europe\/Paris/);
  assert.match(source, /formatToParts/);
});
