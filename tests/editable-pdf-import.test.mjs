import test from "node:test";
import assert from "node:assert/strict";
import { buildEditablePdfSourceFromPages } from "../src/lib/preparation/editable-pdf-import.ts";
import { isEditablePdfSource } from "../src/lib/preparation/editable-pdf-source.ts";

const item = (text, x, y, height = 10.7, fontName = "body") => ({
  text, x, y, height, fontName, width: text.length * height * 0.48,
});

test("un ancien PDF textuel est converti sans réécrire son contenu", () => {
  const source = buildEditablePdfSourceFromPages({
    filename: "Ministry-School-Cours.pdf",
    metadata: { title: "Découvre ce qui te rend unique", author: "Nathalie Boudehent" },
    pages: [
      {
        pageNumber: 1, width: 595, height: 842,
        items: [
          item("Découvre ce qui", 76, 480, 39, "display"),
          item("te rend unique", 76, 433, 39, "display"),
          item("NATHALIE BOUDEHENT", 76, 128, 12, "bold"),
          item("7 novembre 2026 · Ministry School", 76, 105, 10, "body"),
        ],
      },
      {
        pageNumber: 2, width: 595, height: 842,
        items: [
          item("SECTION 01", 99, 622, 9, "bold"),
          item("Tout commence par la grâce,", 99, 580, 25, "display"),
          item("pas par le mérite", 99, 551, 25, "display"),
          item("Nous avons naturellement tendance à mesurer notre valeur", 99, 507, 10.7, "body"),
          item("à ce que nous accomplissons.", 99, 492, 10.7, "body"),
        ],
      },
      {
        pageNumber: 3, width: 595, height: 842,
        items: [
          item("SECTION 02", 99, 745, 9, "bold"),
          item("Ton identité ne se résume pas à ta personnalité", 99, 701, 27, "display"),
          item("Dieu nous a créés avec une combinaison unique.", 99, 590, 10.7, "body"),
        ],
      },
    ],
  });

  assert.equal(isEditablePdfSource(source), true);
  assert.equal(source.document.title, "Découvre ce qui te rend unique");
  assert.equal(source.document.date, "2026-11-07");
  assert.deepEqual(source.document.speakers, ["Nathalie Boudehent"]);
  assert.equal(source.blocks[0].text, "1. Tout commence par la grâce, pas par le mérite");
  assert.match(source.blocks[1].text, /Nous avons naturellement tendance à mesurer notre valeur à ce que nous accomplissons\./);
  assert.equal(source.blocks[2].breakBefore, false);
  assert.equal(source.blocks[2].text, "2. Ton identité ne se résume pas à ta personnalité");
});
