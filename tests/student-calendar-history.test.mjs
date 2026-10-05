import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/lib/data/student.ts", import.meta.url), "utf8");
const functionBody = source.match(/export async function getStudentSessions[\s\S]*?\n}\n\nexport async function getStudentAllSessions/)?.[0] ?? "";

test("le calendrier étudiant ne filtre pas les séances passées", () => {
  assert.ok(functionBody, "getStudentSessions doit exister");
  assert.doesNotMatch(functionBody, /session_date\s*>=\s*today/);
  assert.match(functionBody, /normalizeStudentSessions\(\[\.\.\.ministrySessions, \.\.\.commonSessions\]\)/);
});
