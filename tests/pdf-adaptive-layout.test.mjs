import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pdf = () => readFileSync(new URL("../src/lib/pdf/simple-pdf.ts", import.meta.url), "utf8");

test("la bannière PDF adapte hauteur, taille et position du service au titre", () => {
  const source = pdf();
  assert.match(source, /const choices = \[25, 23, 21, 19\]/);
  assert.match(source, /const serviceBaseline = service \? lastTitleBaseline - lineHeight/);
  assert.match(source, /const height = top - bottom/);
  assert.doesNotMatch(source, /slice\(0, 3\)/);
});

test("les titres et étapes PDF restent avec leur contenu quand ils tiennent sur une page", () => {
  const source = pdf();
  assert.match(source, /this\.ensure\(72\)/);
  assert.match(source, /this\.ensure\(48\)/);
  assert.match(source, /const blockHeight = lines\.length \* 15 \+ 7/);
  assert.match(source, /if \(blockHeight <= 700\) this\.ensure\(blockHeight\)/);
});
