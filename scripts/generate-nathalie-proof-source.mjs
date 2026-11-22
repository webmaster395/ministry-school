import mammoth from "mammoth";
import { parse } from "node-html-parser";

const inputPath = process.argv[2];
if (!inputPath) throw new Error("Usage: node scripts/generate-nathalie-proof-source.mjs <course.docx>");

const { value: html, messages } = await mammoth.convertToHtml({ path: inputPath });
const root = parse(`<main>${html}</main>`).querySelector("main");
if (!root) throw new Error("Le document Word n’a pas pu être lu.");

const text = (node) => node.textContent.replace(/\s+/g, " ").trim();
const directListText = (li) => li.childNodes
  .filter((child) => !["UL", "OL"].includes(child.rawTagName?.toUpperCase?.() ?? ""))
  .map((child) => child.textContent)
  .join("")
  .replace(/\s+/g, " ")
  .trim();

const defaultStyle = (kind, color = "#25302f") => {
  if (kind === "title") return { fontRole: "display", fontSize: 23, lineHeight: 1.13, color, spaceBefore: 0, spaceAfter: 22 };
  if (kind === "heading") return { fontRole: "display", fontSize: 16, lineHeight: 1.18, color, spaceBefore: 13, spaceAfter: 10 };
  if (kind === "quote") return { fontRole: "display", fontSize: 10.5, lineHeight: 1.48, color, spaceBefore: 7, spaceAfter: 11 };
  if (kind === "list-item") return { fontRole: "body", fontSize: 9, lineHeight: 1.4, color, spaceBefore: 0, spaceAfter: 4.6 };
  return { fontRole: "body", fontSize: 9.8, lineHeight: 1.48, color, spaceBefore: 0, spaceAfter: 9 };
};

const blocks = [];
let blockIndex = 0;
const FORCED_PAGE_BREAKS = new Set([
  "Sous le mérite, on devient découragé, aigri ou orgueilleux.",
  "Les dons naturels doivent être exercés de manière sanctifiée :",
  "écoute ;",
]);
const addBlock = (kind, value, options = {}) => {
  if (!value) return;
  blockIndex += 1;
  blocks.push({
    id: `${options.prefix ?? kind}-${String(blockIndex).padStart(3, "0")}`,
    kind,
    text: value,
    style: defaultStyle(kind, options.color),
    breakBefore: options.breakBefore ?? FORCED_PAGE_BREAKS.has(value),
    ...(kind === "list-item" ? { listLevel: options.listLevel ?? 0 } : {}),
  });
};

const addList = (list, depth = 0) => {
  for (const li of list.childNodes.filter((node) => node.rawTagName?.toUpperCase?.() === "LI")) {
    const value = directListText(li);
    addBlock(/^Verset (clé|d’appui)\s*:/i.test(value) ? "quote" : "list-item", value, { listLevel: Math.min(depth, 2) });
    for (const nested of li.childNodes.filter((node) => ["UL", "OL"].includes(node.rawTagName?.toUpperCase?.() ?? ""))) addList(nested, depth + 1);
  }
};

const children = root.childNodes.filter((node) => node.rawTagName);
let bodyStarted = false;
for (const node of children) {
  const tag = node.rawTagName.toUpperCase();
  const value = text(node);
  if (tag === "H2") {
    bodyStarted = true;
    addBlock("title", value, { prefix: "section", breakBefore: true });
    continue;
  }
  if (!bodyStarted) continue;
  if (tag === "H3") {
    const profileColor = /rouge/i.test(value) ? "#e34d1b"
      : /jaune/i.test(value) ? "#f19f00"
        : /vert/i.test(value) ? "#7c9b2c"
          : /bleu/i.test(value) ? "#27a8bd"
            : "#27bdc2";
    addBlock("heading", value, { prefix: "profile", color: profileColor, breakBefore: /^[BC]\./.test(value) });
  } else if (tag === "P") addBlock("paragraph", value);
  else if (["UL", "OL"].includes(tag)) addList(node);
}

const source = {
  schema: "ministry-school.editable-pdf",
  version: 1,
  sourceId: "proof-nathalie-boudehent-2026-11-07-full",
  sourceNotice: "Source structurée de preuve créée à partir du document Word fourni par l’administratrice. Aucun texte pédagogique n’a été réécrit.",
  document: {
    title: "Découvre ce qui te rend unique",
    date: "2026-11-07",
    speakers: ["Nathalie Boudehent"],
    schedule: "Samedi 7 novembre 2026, 10h30–13h00",
    location: "MLK Studio (MLK 2) — 2 Rue Tirard, 94000 Créteil",
    category: "Synthèse de cours",
  },
  template: {
    id: "ministry-editorial-anthracite",
    version: 1,
    pageSize: "A4",
    assetSet: "ministry-school-2026",
  },
  blocks,
};

process.stderr.write(JSON.stringify({ blockCount: blocks.length, warnings: messages }) + "\n");
process.stdout.write(`import type { EditablePdfSourceV1 } from "./editable-pdf-source.ts";\n\nexport const NATHALIE_PROOF_SOURCE: EditablePdfSourceV1 = ${JSON.stringify(source, null, 2)};\n`);
