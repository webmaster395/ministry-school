import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const experience = readFileSync(new URL("../src/components/course/CourseExperience.tsx", import.meta.url), "utf8");
const selector = readFileSync(new URL("../src/components/gestion/TrainerMultiSelect.tsx", import.meta.url), "utf8");
const studentData = readFileSync(new URL("../src/lib/data/student.ts", import.meta.url), "utf8");

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

test("la liste des cours ne dépend pas des colonnes de la migration de preview", () => {
  const sessionFields = studentData.match(/const SESSION_FIELDS =\s*\n\s*"([^"]+)"/)?.[1] ?? "";
  assert.ok(sessionFields.includes("course_id"));
  assert.ok(!sessionFields.includes("video_url"));
  assert.ok(!sessionFields.includes("cover_image_path"));
});

test("les ressources et travaux enrichis ont un fallback vers le schéma historique", () => {
  assert.match(studentData, /const legacy = await supabase[\s\S]*?from\("materials"\)/);
  assert.match(studentData, /const legacy = await supabase[\s\S]*?from\("assignments"\)/);
});
