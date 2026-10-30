import assert from "node:assert/strict";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const moduleUrl = pathToFileURL(resolve("src/lib/pdf/structured-content.ts")).href;
const { pdfContentBlocks } = await import(moduleUrl);

test("la présentation PDF conserve paragraphes, retours à la ligne et listes Markdown", () => {
  assert.deepEqual(
    pdfContentBlocks("Premier paragraphe.\nDeuxième ligne.\n\n- Alpha\n- **Bêta**\n\n3. Troisième\n4. Quatrième"),
    [
      { kind: "paragraph", text: "Premier paragraphe.\nDeuxième ligne." },
      { kind: "list", ordered: false, start: 1, items: ["Alpha", "Bêta"] },
      { kind: "list", ordered: true, start: 3, items: ["Troisième", "Quatrième"] },
    ],
  );
});

test("la présentation PDF convertit aussi les paragraphes et listes HTML", () => {
  assert.deepEqual(
    pdfContentBlocks("<p>Premier bloc.</p><p>Deuxième<br>ligne.</p><ul><li>Un</li><li>Deux</li></ul><ol><li>Trois</li><li>Quatre</li></ol>"),
    [
      { kind: "paragraph", text: "Premier bloc." },
      { kind: "paragraph", text: "Deuxième\nligne." },
      { kind: "list", ordered: false, start: 1, items: ["Un", "Deux"] },
      { kind: "list", ordered: true, start: 1, items: ["Trois", "Quatre"] },
    ],
  );
});

test("la route PDF utilise les blocs structurés au lieu d'aplatir la présentation", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile("src/app/gestion/projets-formations/[id]/pdf/route.ts", "utf8");
  assert.match(source, /pdfContentBlocks\(opportunity\.description\)/);
  assert.match(source, /preserveLineBreaks: true/);
  assert.doesNotMatch(source, /plainTextContent\(opportunity\.description\)/);
});
