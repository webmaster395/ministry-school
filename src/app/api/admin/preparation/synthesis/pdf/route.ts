import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFPage, type PDFFont, rgb } from "pdf-lib";
import { getViewer } from "@/lib/data/viewer";
import { formatSynthesisDate, normalizeTrainingSynthesis, type SynthesisBlock } from "@/lib/preparation/synthesis";

export const runtime = "nodejs";

const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 48;
const COLORS = {
  dark: rgb(0.055, 0.09, 0.08),
  cream: rgb(0.984, 0.933, 0.855),
  paper: rgb(0.996, 0.992, 0.978),
  text: rgb(0.15, 0.18, 0.17),
  muted: rgb(0.42, 0.46, 0.44),
  line: rgb(0.86, 0.86, 0.83),
  turquoise: rgb(0.349, 0.788, 0.792),
};

type Fonts = { body: PDFFont; label: PDFFont; title: PDFFont };

function pdfColor(value: string) {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
  if (!match) return COLORS.turquoise;
  return rgb(Number.parseInt(match[1], 16) / 255, Number.parseInt(match[2], 16) / 255, Number.parseInt(match[3], 16) / 255);
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r/g, "").split("\n")) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) { lines.push(""); continue; }
    let line = words.shift()!;
    for (const word of words) {
      const candidate = `${line} ${word}`;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
      else { lines.push(line); line = word; }
    }
    lines.push(line);
  }
  return lines;
}

function blockMetrics(block: SynthesisBlock, fonts: Fonts) {
  if (block.type === "heading") {
    const size = block.level === 1 ? 20 : block.level === 2 ? 16 : 13;
    const leading = size * 1.18;
    const lines = wrap(block.text, fonts.title, size, PAGE.width - MARGIN * 2);
    return { font: fonts.title, size, leading, lines, before: block.level === 1 ? 17 : 12, after: 8 };
  }
  const size = block.type === "quote" ? 11 : 10.2;
  const leading = block.type === "quote" ? 15.6 : 14.5;
  const indent = block.type === "bullet" ? 15 : block.type === "quote" ? 18 : 0;
  const font = block.type === "quote" ? fonts.title : fonts.body;
  return { font, size, leading, lines: wrap(block.text, font, size, PAGE.width - MARGIN * 2 - indent), before: block.type === "quote" ? 9 : 2, after: 7 };
}

export async function POST(request: Request) {
  const viewer = await getViewer();
  const referer = request.headers.get("referer");
  let localPreview = false;
  if (process.env.NODE_ENV === "development" && referer) {
    try { localPreview = new URL(referer).pathname.startsWith("/preview/"); } catch { /* en-tête invalide */ }
  }
  if (!viewer?.roles.superAdmin && !localPreview) return Response.json({ error: "Accès refusé." }, { status: 403 });

  let raw: unknown;
  try { raw = await request.json(); }
  catch { return Response.json({ error: "Document invalide." }, { status: 400 }); }
  const synthesis = normalizeTrainingSynthesis((raw as { synthesis?: unknown })?.synthesis);
  const primaryColor = synthesis.blocks.find((block) => block.type === "heading")?.color ?? "#59c9ca";

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(synthesis.title);
  pdf.setAuthor("Ministry School");
  pdf.setCreator("Ministry School — Préparation");
  pdf.setSubject(`Synthèse du ${formatSynthesisDate(synthesis.date)}`);

  const root = process.cwd();
  const [bodyBytes, titleBytes, logoBytes, coverBytes] = await Promise.all([
    readFile(path.join(root, "src/app/fonts/jost-latin.ttf")),
    readFile(path.join(root, "src/app/fonts/bricolage-grotesque-latin.ttf")),
    readFile(path.join(root, "public/logo-compact.png")),
    readFile(path.join(root, "public/landing/hero-formation-programme.jpg")),
  ]);
  const fonts: Fonts = {
    body: await pdf.embedFont(bodyBytes, { subset: false }),
    label: await pdf.embedFont(bodyBytes, { subset: false }),
    title: await pdf.embedFont(titleBytes, { subset: false }),
  };
  const logo = await pdf.embedPng(logoBytes);
  const cover = await pdf.embedJpg(coverBytes);
  const pages: PDFPage[] = [];

  const coverPage = pdf.addPage([PAGE.width, PAGE.height]);
  pages.push(coverPage);
  coverPage.drawImage(cover, { x: 0, y: 0, width: PAGE.width, height: PAGE.height });
  coverPage.drawRectangle({ x: 0, y: 0, width: PAGE.width, height: PAGE.height, color: COLORS.dark, opacity: 0.8 });
  const logoWidth = 176;
  coverPage.drawImage(logo, { x: MARGIN, y: PAGE.height - 92, width: logoWidth, height: logoWidth * logo.height / logo.width });
  coverPage.drawText("SYNTHÈSE DE COURS", { x: MARGIN, y: PAGE.height - 270, font: fonts.label, size: 9, color: pdfColor(primaryColor) });
  let coverY = PAGE.height - 310;
  const titleLines = wrap(synthesis.title, fonts.title, 35, PAGE.width - MARGIN * 2).slice(0, 4);
  titleLines.forEach((line, index) => coverPage.drawText(line, { x: MARGIN, y: coverY - index * 38, font: fonts.title, size: 35, color: COLORS.cream }));
  coverY -= titleLines.length * 38 + 8;
  if (synthesis.subtitle) {
    const subtitleLines = wrap(synthesis.subtitle, fonts.body, 12, PAGE.width - MARGIN * 2).slice(0, 4);
    subtitleLines.forEach((line, index) => coverPage.drawText(line, { x: MARGIN, y: coverY - index * 17, font: fonts.body, size: 12, color: COLORS.cream, opacity: 0.74 }));
  }
  coverPage.drawLine({ start: { x: MARGIN, y: 128 }, end: { x: PAGE.width - MARGIN, y: 128 }, thickness: 0.7, color: COLORS.cream, opacity: 0.28 });
  coverPage.drawText("DATE", { x: MARGIN, y: 104, font: fonts.label, size: 6.8, color: COLORS.cream, opacity: 0.54 });
  coverPage.drawText(formatSynthesisDate(synthesis.date), { x: MARGIN, y: 82, font: fonts.title, size: 13, color: COLORS.cream });
  coverPage.drawText("INTERVENANT(S)", { x: 310, y: 104, font: fonts.label, size: 6.8, color: COLORS.cream, opacity: 0.54 });
  wrap(synthesis.speakers || "À compléter", fonts.title, 13, PAGE.width - 310 - MARGIN).slice(0, 2).forEach((line, index) => coverPage.drawText(line, { x: 310, y: 82 - index * 16, font: fonts.title, size: 13, color: COLORS.cream }));

  const addBodyPage = () => {
    const page = pdf.addPage([PAGE.width, PAGE.height]);
    pages.push(page);
    page.drawRectangle({ x: 0, y: 0, width: PAGE.width, height: PAGE.height, color: COLORS.paper });
    page.drawText("MINISTRY SCHOOL", { x: MARGIN, y: PAGE.height - 41, font: fonts.label, size: 7.2, color: COLORS.text });
    const headerTitle = synthesis.title.length > 68 ? `${synthesis.title.slice(0, 65)}…` : synthesis.title;
    page.drawText(headerTitle, { x: PAGE.width - MARGIN - fonts.body.widthOfTextAtSize(headerTitle, 7.2), y: PAGE.height - 41, font: fonts.body, size: 7.2, color: COLORS.muted });
    page.drawLine({ start: { x: MARGIN, y: PAGE.height - 55 }, end: { x: PAGE.width - MARGIN, y: PAGE.height - 55 }, thickness: 0.55, color: COLORS.line });
    return { page, y: PAGE.height - 84 };
  };

  let { page, y } = addBodyPage();
  if (synthesis.introduction) {
    const introLines = wrap(synthesis.introduction, fonts.title, 12.5, PAGE.width - MARGIN * 2);
    for (const line of introLines) {
      if (y < 76) ({ page, y } = addBodyPage());
      page.drawText(line, { x: MARGIN, y, font: fonts.title, size: 12.5, color: COLORS.muted });
      y -= 17.5;
    }
    y -= 13;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE.width - MARGIN, y }, thickness: 0.55, color: COLORS.line });
    y -= 18;
  }

  for (let index = 0; index < synthesis.blocks.length; index++) {
    const block = synthesis.blocks[index];
    const metrics = blockMetrics(block, fonts);
    const next = synthesis.blocks[index + 1];
    const keepWithNext = block.type === "heading" && next ? Math.min(58, blockMetrics(next, fonts).lines.length * 14.5 + 14) : 0;
    const fullHeight = metrics.before + metrics.lines.length * metrics.leading + metrics.after;
    if (y - Math.min(fullHeight, 135) - keepWithNext < 58) ({ page, y } = addBodyPage());
    y -= metrics.before;

    const accent = pdfColor(block.color);
    let firstLine = true;
    for (const line of metrics.lines) {
      if (y < 58) {
        ({ page, y } = addBodyPage());
        firstLine = false;
      }
      let x = MARGIN;
      if (block.type === "bullet") {
        if (firstLine) page.drawCircle({ x: MARGIN + 3, y: y + 4, size: 2.1, color: accent });
        x += 15;
      } else if (block.type === "quote") {
        page.drawLine({ start: { x: MARGIN + 2, y: y + 10 }, end: { x: MARGIN + 2, y: y - metrics.leading + 6 }, thickness: 1.6, color: accent });
        x += 18;
      }
      page.drawText(line, { x, y, font: metrics.font, size: metrics.size, color: block.type === "heading" ? accent : block.type === "quote" ? COLORS.muted : COLORS.text });
      y -= metrics.leading;
      firstLine = false;
    }
    y -= metrics.after;
  }

  pages.forEach((current, index) => {
    if (index === 0) return;
    current.drawLine({ start: { x: MARGIN, y: 36 }, end: { x: PAGE.width - MARGIN, y: 36 }, thickness: 0.5, color: COLORS.line });
    current.drawText("MINISTRY SCHOOL · SYNTHÈSE", { x: MARGIN, y: 20, font: fonts.label, size: 6.5, color: COLORS.muted });
    const count = `${index + 1}/${pages.length}`;
    current.drawText(count, { x: PAGE.width - MARGIN - fonts.body.widthOfTextAtSize(count, 7), y: 20, font: fonts.body, size: 7, color: COLORS.muted });
  });

  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Ministry-School-Synthese-${synthesis.date}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
