import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("la ligne de vie ouvre l’impression native et masque la navigation", () => {
  const page = read("src/app/preview/ligne-de-vie-v1/page.tsx");
  const styles = read("src/app/preview/ligne-de-vie-v1/preview.module.css");
  const globals = read("src/app/globals.css");

  assert.match(page, /onClick=\{printLifeLine\}/);
  assert.match(page, /window\.print\(\)/);
  assert.match(page, /printing-life-line/);
  assert.match(page, /Imprimer ma ligne de vie/);
  assert.match(styles, /@media print/);
  assert.match(styles, /\.screenFooter,.dialogBackdrop\{display:none!important\}/);
  assert.match(globals, /body\.printing-life-line > \*/);
  assert.match(globals, /\.life-line-print-root/);
});
