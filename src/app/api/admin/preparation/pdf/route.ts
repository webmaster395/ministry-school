import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFPage, PDFFont, rgb } from "pdf-lib";
import { getViewer } from "@/lib/data/viewer";
import { formatProgramDate, normalizeTrainingProgram, type ProgramDay, type ProgramSlot } from "@/lib/preparation/program";

export const runtime = "nodejs";

const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 42;
const COLORS = {
  ink: rgb(0.996, 0.918, 0.82),
  dark: rgb(0.055, 0.09, 0.08),
  paper: rgb(0.09, 0.13, 0.12),
  cream: rgb(0.984, 0.933, 0.855),
  muted: rgb(0.72, 0.70, 0.65),
  line: rgb(0.25, 0.29, 0.27),
  orange: rgb(0.886, 0.302, 0.106),
  turquoise: rgb(0.349, 0.788, 0.792),
  green: rgb(0.788, 0.863, 0.416),
};

type Fonts = { body: PDFFont; label: PDFFont; title: PDFFont };

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r/g, "").split("\n")) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = words.shift()!;
    for (const word of words) {
      const candidate = `${line} ${word}`;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

function drawLines(page: PDFPage, lines: string[], x: number, y: number, font: PDFFont, size: number, color = COLORS.ink, leading = size * 1.35) {
  lines.forEach((line, index) => page.drawText(line, { x, y: y - index * leading, font, size, color }));
  return y - lines.length * leading;
}

function slotHeight(slot: ProgramSlot, fonts: Fonts) {
  const titleLines = wrap(slot.title || "Sans titre", fonts.title, 15, 358).length;
  const descriptionLines = slot.description ? Math.min(2, wrap(slot.description, fonts.body, 9, 358).length) : 0;
  return Math.max(54, 13 + titleLines * 18 + descriptionLines * 13);
}

function pdfColor(value: string) {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
  if (!match) return COLORS.orange;
  return rgb(Number.parseInt(match[1], 16) / 255, Number.parseInt(match[2], 16) / 255, Number.parseInt(match[3], 16) / 255);
}

function drawSectionHeading(page: PDFPage, label: string, y: number, fonts: Fonts, color: ReturnType<typeof rgb>) {
  page.drawText(label.toLocaleUpperCase("fr-FR"), { x: MARGIN, y, font: fonts.label, size: 11, color });
  const labelWidth = fonts.label.widthOfTextAtSize(label.toLocaleUpperCase("fr-FR"), 11);
  page.drawLine({ start: { x: MARGIN + labelWidth + 15, y: y + 3 }, end: { x: PAGE.width - MARGIN, y: y + 3 }, thickness: 0.8, color: COLORS.line });
  return y - 26;
}

function drawSlot(page: PDFPage, slot: ProgramSlot, y: number, fonts: Fonts, accent: ReturnType<typeof rgb>) {
  const height = slotHeight(slot, fonts);
  const time = slot.end ? `${slot.start || "—"}\n${slot.end}` : (slot.start || "—");
  const timeLines = time.split("\n");
  timeLines.forEach((line, index) => page.drawText(line.replace(":", "h"), { x: MARGIN, y: y - 3 - index * 15, font: fonts.title, size: 14, color: COLORS.ink }));
  page.drawLine({ start: { x: MARGIN + 70, y: y + 2 }, end: { x: MARGIN + 70, y: y - height + 17 }, thickness: 2, color: accent });
  const contentX = MARGIN + 88;
  const width = PAGE.width - MARGIN - contentX;
  let cursor = y;
  cursor -= 4;
  cursor = drawLines(page, wrap(slot.title || "Sans titre", fonts.title, 15, width), contentX, cursor, fonts.title, 15, accent, 17.5);
  if (slot.description) drawLines(page, wrap(slot.description, fonts.body, 9, width).slice(0, 2), contentX, cursor - 3, fonts.body, 9, COLORS.muted, 12.5);
  page.drawLine({ start: { x: MARGIN + 88, y: y - height + 8 }, end: { x: PAGE.width - MARGIN, y: y - height + 8 }, thickness: 0.45, color: COLORS.line });
  return y - height;
}

export async function POST(request: Request) {
  const viewer = await getViewer();
  const referer = request.headers.get("referer");
  let localPreview = false;
  if (process.env.NODE_ENV === "development" && referer) {
    try { localPreview = new URL(referer).pathname === "/preview/preparation"; } catch { /* en-tête invalide */ }
  }
  if (!viewer?.roles.superAdmin && !localPreview) return Response.json({ error: "Accès refusé." }, { status: 403 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Document invalide." }, { status: 400 });
  }
  const program = normalizeTrainingProgram((raw as { program?: unknown })?.program);
  const primaryColor = program.days.flatMap((day) => [...day.morning, ...day.afternoon])[0]?.color ?? "#e34d1b";
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(program.title);
  pdf.setAuthor("Ministry School");
  pdf.setCreator("Ministry School — Préparation");
  pdf.setSubject(`Programme du ${formatProgramDate(program.baseDate)}`);

  const root = process.cwd();
  const [bodyBytes, labelBytes, titleBytes, logoBytes, coverBytes] = await Promise.all([
    readFile(path.join(root, "src/app/fonts/geist-latin.ttf")),
    readFile(path.join(root, "src/app/fonts/jost-latin.ttf")),
    readFile(path.join(root, "src/app/fonts/bricolage-grotesque-latin.ttf")),
    readFile(path.join(root, "public/logo-compact.png")),
    readFile(path.join(root, "public/landing/hero-formation-programme.jpg")),
  ]);
  const fonts: Fonts = {
    // Les TTF sont dérivées des WOFF2 officielles de l'interface. L'intégration
    // complète évite les sous-ensembles variables illisibles dans certains lecteurs.
    body: await pdf.embedFont(bodyBytes, { subset: false }),
    label: await pdf.embedFont(labelBytes, { subset: false }),
    title: await pdf.embedFont(titleBytes, { subset: false }),
  };
  const logo = await pdf.embedPng(logoBytes);
  const cover = await pdf.embedJpg(coverBytes);
  const pages: PDFPage[] = [];

  const addPage = (day: ProgramDay, coverPage: boolean) => {
    const page = pdf.addPage([PAGE.width, PAGE.height]);
    pages.push(page);
    page.drawRectangle({ x: 0, y: 0, width: PAGE.width, height: PAGE.height, color: COLORS.paper });
    let y: number;
    if (coverPage) {
      const height = 250;
      page.drawImage(cover, { x: 0, y: PAGE.height - height, width: PAGE.width, height });
      page.drawRectangle({ x: 0, y: PAGE.height - height, width: PAGE.width, height, color: COLORS.dark, opacity: 0.74 });
      const logoWidth = 174;
      page.drawImage(logo, { x: MARGIN, y: PAGE.height - 77, width: logoWidth, height: logoWidth * logo.height / logo.width });
      page.drawText(day.kind.toLocaleUpperCase("fr-FR"), { x: MARGIN, y: PAGE.height - 112, font: fonts.label, size: 8.5, color: pdfColor(primaryColor) });
      drawLines(page, wrap(program.title, fonts.title, 24, PAGE.width - MARGIN * 2).slice(0, 2), MARGIN, PAGE.height - 145, fonts.title, 24, COLORS.cream, 27);
      page.drawText(formatProgramDate(day.date, { day: "numeric", month: "long", year: "numeric" }), { x: MARGIN, y: PAGE.height - 224, font: fonts.label, size: 11, color: COLORS.cream });
      y = PAGE.height - height - 33;
    } else {
      page.drawText("MINISTRY SCHOOL", { x: MARGIN, y: PAGE.height - 47, font: fonts.label, size: 8.5, color: pdfColor(primaryColor) });
      page.drawText(`${program.title} · ${formatProgramDate(day.date, { day: "numeric", month: "long", year: "numeric" })}`, { x: MARGIN, y: PAGE.height - 70, font: fonts.title, size: 15, color: COLORS.ink });
      page.drawLine({ start: { x: MARGIN, y: PAGE.height - 84 }, end: { x: PAGE.width - MARGIN, y: PAGE.height - 84 }, thickness: 0.7, color: COLORS.line });
      y = PAGE.height - 112;
    }
    return { page, y };
  };

  for (let dayIndex = 0; dayIndex < program.days.length; dayIndex++) {
    const day = program.days[dayIndex];
    let { page, y } = addPage(day, true);
    if (dayIndex === 0 && program.introduction) {
      y = drawLines(page, wrap(program.introduction, fonts.body, 10, PAGE.width - MARGIN * 2), MARGIN, y, fonts.body, 10, COLORS.muted, 14) - 7;
    }

    const sections = [
      { key: "morning" as const, label: "Matinée", slots: day.morning },
      ...(day.includeAfternoon ? [{ key: "afternoon" as const, label: "Après-midi", slots: day.afternoon }] : []),
    ];
    for (const section of sections) {
      const accent = pdfColor(section.slots[0]?.color ?? primaryColor);
      if (y < 118) ({ page, y } = addPage(day, false));
      y = drawSectionHeading(page, section.label, y, fonts, accent);
      if (!section.slots.length) {
        page.drawText("Programme à compléter", { x: MARGIN + 88, y, font: fonts.body, size: 10, color: COLORS.muted });
        y -= 46;
      }
      for (const slot of section.slots) {
        const height = slotHeight(slot, fonts);
        if (y - height < 52) {
          ({ page, y } = addPage(day, false));
          y = drawSectionHeading(page, `${section.label} — suite`, y, fonts, accent);
        }
        y = drawSlot(page, slot, y, fonts, pdfColor(slot.color));
      }
      y -= 12;
    }
  }

  pages.forEach((page, index) => {
    page.drawLine({ start: { x: MARGIN, y: 34 }, end: { x: PAGE.width - MARGIN, y: 34 }, thickness: 0.45, color: COLORS.line });
    page.drawText("MINISTRY SCHOOL", { x: MARGIN, y: 19, font: fonts.label, size: 6.8, color: COLORS.muted });
    const pageText = `${formatProgramDate(program.baseDate, { day: "2-digit", month: "2-digit", year: "numeric" })}  ·  ${index + 1}/${pages.length}`;
    page.drawText(pageText, { x: PAGE.width - MARGIN - fonts.body.widthOfTextAtSize(pageText, 7.2), y: 19, font: fonts.body, size: 7.2, color: COLORS.muted });
  });

  const bytes = await pdf.save();
  const filename = `Ministry-School-Programme-${program.baseDate}.pdf`;
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
