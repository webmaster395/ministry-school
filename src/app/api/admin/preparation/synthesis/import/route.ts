import { NextResponse } from "next/server";
import { getViewer } from "@/lib/data/viewer";
import { MINISTRY_PROGRAM_COLORS } from "@/lib/preparation/program";
import { normalizeTrainingSynthesis, type SynthesisBlock } from "@/lib/preparation/synthesis";

export const runtime = "nodejs";

const MAX_WORD_BYTES = 12 * 1024 * 1024;

function importedNodeText(node: { tagName: string; structuredText: string; childNodes: Array<{ textContent: string; tagName?: string }> }) {
  if (node.tagName !== "LI") return node.structuredText;
  return node.childNodes
    .filter((child) => child.tagName !== "UL" && child.tagName !== "OL")
    .map((child) => child.textContent)
    .join("");
}

function dateFromFilename(name: string) {
  const match = /(?:^|\D)(20\d{2})(\d{2})(\d{2})(?:\D|$)/.exec(name);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

function fileMetadata(name: string) {
  const stem = name.replace(/\.docx$/i, "").replace(/^Ministry School\s*\d{8}\s*-\s*/i, "");
  const parts = stem.split(/\s+-\s+/).map((part) => part.trim()).filter(Boolean);
  return {
    title: parts[0] ?? "",
    speakers: parts.length > 1 ? parts.at(-1) ?? "" : "",
  };
}

export async function POST(request: Request) {
  const viewer = await getViewer();
  const referer = request.headers.get("referer");
  let localPreview = false;
  if (process.env.NODE_ENV === "development" && referer) {
    try { localPreview = new URL(referer).pathname.startsWith("/preview/"); } catch { /* en-tête invalide */ }
  }
  if (!viewer?.roles.superAdmin && !localPreview) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Ajoutez un fichier Word." }, { status: 400 });
  if (!file.name.toLowerCase().endsWith(".docx")) return NextResponse.json({ error: "Le fichier doit être au format .docx." }, { status: 400 });
  if (file.size > MAX_WORD_BYTES) return NextResponse.json({ error: "Le fichier Word dépasse 12 Mo." }, { status: 413 });

  try {
    const [{ default: mammoth }, { parse }] = await Promise.all([
      import("mammoth"),
      import("node-html-parser"),
    ]);
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await mammoth.convertToHtml({ buffer }, {
      styleMap: [
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Subtitle'] => p.subtitle:fresh",
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
      ],
      includeDefaultStyleMap: true,
    });
    const root = parse(result.value);
    const nodes = root.querySelectorAll("h1,h2,h3,h4,p,li");
    const firstHeadingIndex = nodes.findIndex((node) => /^H[1-4]$/.test(node.tagName));
    const prefaceParagraphs = nodes
      .slice(0, firstHeadingIndex >= 0 ? firstHeadingIndex : 4)
      .filter((node) => node.tagName === "P")
      .map((node) => node.structuredText.trim())
      .filter(Boolean);
    const metadata = fileMetadata(file.name);
    const title = prefaceParagraphs[0] || metadata.title || "Synthèse de cours";
    const speakers = prefaceParagraphs[1] || metadata.speakers;
    const skip = new Set(prefaceParagraphs.slice(0, 2));
    const headingLevels = nodes
      .filter((node) => /^H[1-4]$/.test(node.tagName))
      .map((node) => Number(node.tagName.slice(1)));
    const minimumHeading = headingLevels.length ? Math.min(...headingLevels) : 1;
    const blocks: SynthesisBlock[] = [];

    for (const node of nodes) {
      // Mammoth represents nested Word lists as nested <li> elements. Reading
      // structuredText on the parent would duplicate every nested item.
      const text = importedNodeText(node).replace(/\s+/g, " ").trim();
      if (!text || (node.tagName === "P" && skip.has(text))) continue;
      if (node.tagName === "P" && node.parentNode && "tagName" in node.parentNode && (node.parentNode as { tagName?: string }).tagName === "LI") continue;
      const rawLevel = /^H[1-4]$/.test(node.tagName) ? Number(node.tagName.slice(1)) : 1;
      const level = Math.min(3, Math.max(1, rawLevel - minimumHeading + 1)) as 1 | 2 | 3;
      const type = /^H[1-4]$/.test(node.tagName) ? "heading" : node.tagName === "LI" ? "bullet" : "paragraph";
      blocks.push({
        id: crypto.randomUUID(),
        type,
        level,
        text: text.slice(0, 12000),
        color: MINISTRY_PROGRAM_COLORS[blocks.length % MINISTRY_PROGRAM_COLORS.length].value,
      });
      if (blocks.length >= 800) break;
    }

    return NextResponse.json({
      synthesis: normalizeTrainingSynthesis({
        title,
        speakers,
        date: dateFromFilename(file.name) ?? undefined,
        introduction: "",
        blocks,
      }),
      warnings: result.messages.map((message) => message.message).slice(0, 8),
      importedBlocks: blocks.length,
    });
  } catch (error) {
    console.error("Word synthesis import failed", error);
    return NextResponse.json({ error: "Le document Word n’a pas pu être analysé." }, { status: 422 });
  }
}
