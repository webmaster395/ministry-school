import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("les KPI opérationnels vides disparaissent du tableau de bord", async () => {
  const source = await readFile(new URL("../src/components/admin/OverviewTab.tsx", import.meta.url), "utf8");
  assert.match(source, /currentProjects > 0 \|\| finishedProjects > 0/);
  assert.match(source, /currentServiceTrainings > 0 \|\| finishedServiceTrainings > 0/);
  assert.match(source, /toValidate > 0 \? \[\{ value: toValidate/);
  assert.match(source, /expected > 0 \? \[\{ value: expected/);
  assert.match(source, /pending > 0 \? \[\{ value: pending/);
  assert.match(source, /students\.length, label: "Membres inscrits"/);
});
