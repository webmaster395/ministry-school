import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const experience = readFileSync(new URL("../src/components/course/CourseExperience.tsx", import.meta.url), "utf8");
const selector = readFileSync(new URL("../src/components/gestion/TrainerMultiSelect.tsx", import.meta.url), "utf8");

test("classe les anciennes tâches avec la date ISO de la séance", () => {
  assert.match(experience, /dateIso: string/);
  assert.match(experience, /new Date\(`\$\{session\.dateIso\}T23:59:59`\)/);
  assert.doesNotMatch(experience, /new Date\(`\$\{session\.date\}T23:59:59`\)/);
});

test("conserve les formateurs sélectionnés pendant une recherche", () => {
  assert.match(selector, /new Set\(selectedIds\)/);
  assert.match(selector, /type="hidden" name="trainer_ids"/);
  assert.doesNotMatch(selector, /name="trainer_ids" value=\{trainer\.id\} defaultChecked/);
});
