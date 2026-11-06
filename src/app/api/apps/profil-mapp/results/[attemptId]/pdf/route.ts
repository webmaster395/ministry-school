import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { getMappResultBundle } from "@/lib/mapp/server";
import { normalizeIntegralV10, INTEGRAL_V10_SOURCE_SHA256 } from "@/lib/editorial/integral-v10";
import { combinationId } from "@/lib/editorial/editorial-identifiers";
import { applyTieBreak, type TieBreakRecord } from "@/lib/results/tie-breaker";
import { formatRelativePercentage, toRelativePercentages } from "@/lib/results/relative-percentages";
import type { ResultProfileCode } from "@/lib/results/premium-result-model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProfileCode = ResultProfileCode;
const profileOrder: ProfileCode[] = ["conquerant", "communiquant", "facilitateur", "analyste"];
const source = normalizeIntegralV10();
const ptPerMm = 72 / 25.4;
const mm = (value: number) => value * ptPerMm;

function safeFilename(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "participant";
}

function wrap(font: PDFFont, text: string, size: number, maxWidth: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
    else { if (line) lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

function drawWrapped(page: PDFPage, font: PDFFont, text: string, x: number, y: number, width: number, size: number, lineHeight: number, color = rgb(0.12, 0.12, 0.13)) {
  for (const line of wrap(font, text, size, width)) {
    page.drawText(line, { x, y, size, font, color });
    y -= lineHeight;
  }
  return y;
}

function response(bytes: Uint8Array, fullName: string) {
  return new Response(bytes as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="profil-mapp-${safeFilename(fullName)}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  let bundle;
  try {
    bundle = await getMappResultBundle(attemptId);
  } catch {
    return Response.json({ error: "Résultat introuvable ou accès refusé." }, { status: 404 });
  }
  const requestedRevision = new URL(request.url).searchParams.get("revision");
  if (requestedRevision && requestedRevision !== bundle.resultRevisionId) {
    return Response.json({ error: "La révision demandée n’est plus la révision active." }, { status: 409 });
  }

  const scores = bundle.scores.map((row) => ({ code: String(row.dimensionCode), value: Number(row.percentage) }));
  const displayValues = toRelativePercentages(scores);
  const classification = applyTieBreak(scores, bundle.tieBreak as TieBreakRecord | null);
  const fullName = bundle.participantName || "Participant Profil MAPP";

  if (!classification.primary || !classification.secondary) {
    const mixedCodes = (bundle.tieBreak?.persistent_codes as ProfileCode[] | undefined)
      ?? classification.primaryCandidates.filter((code): code is ProfileCode => profileOrder.includes(code as ProfileCode));
    if (mixedCodes.length < 2) {
      return Response.json({ error: "Ce résultat doit être précisé avant de générer le livret." }, { status: 409 });
    }
    const labels: Record<ProfileCode, string> = { conquerant: "Conquérant", communiquant: "Communiquant", facilitateur: "Facilitateur", analyste: "Analyste" };
    const document = await PDFDocument.create();
    const page = document.addPage([mm(210), mm(297)]);
    const regular = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    page.drawRectangle({ x: 0, y: 0, width: mm(210), height: mm(297), color: rgb(0.02, 0.19, 0.22) });
    page.drawText("PROFIL MAPP · TES TENDANCES", { x: mm(20), y: mm(267), size: 11, font: bold, color: rgb(0.61, 0.79, 0.79) });
    page.drawText(fullName, { x: mm(20), y: mm(245), size: 20, font: regular, color: rgb(1, 1, 1) });
    const title = mixedCodes.length === 2 ? "Deux tendances se distinguent dans ton profil." : mixedCodes.length === 3 ? "Ton profil révèle trois tendances fortes." : "Quatre tendances ressortent à égalité.";
    drawWrapped(page, bold, title, mm(20), mm(215), mm(170), 27, 32, rgb(1, 1, 1));
    const names = mixedCodes.map((code) => labels[code]);
    const nameList = names.length === 2 ? `${names[0]} et ${names[1]}` : `${names.slice(0, -1).join(", ")} et ${names.at(-1)}`;
    drawWrapped(page, regular, `Tes réponses font ressortir plusieurs tendances avec la même intensité : ${nameList}. Plutôt que de te réduire à un seul profil, découvre ce que chacune révèle de ta manière de fonctionner.`, mm(20), mm(164), mm(165), 11.5, 17, rgb(0.88, 0.94, 0.94));
    document.setTitle(`Profil MAPP · ${fullName}`);
    document.setSubject(`Profil mixte · bibliothèque V10 ${INTEGRAL_V10_SOURCE_SHA256}`);
    return response(new Uint8Array(await document.save()), fullName);
  }

  const primary = classification.primary;
  const secondary = classification.secondary;
  const template = await readFile(path.join(process.cwd(), "public", "apps", "profil-mapp", "pdf-templates", `${primary}.pdf`));
  const pdf = await PDFDocument.load(template);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages = pdf.getPages();

  const coverNameMaxWidth = mm(100);
  const coverNameSize = Math.max(13, Math.min(18, (coverNameMaxWidth / regular.widthOfTextAtSize(fullName, 18)) * 18));
  pages[0].drawText(fullName, { x: mm(20), y: mm(219), size: coverNameSize, font: regular, color: rgb(0.608, 0.788, 0.792) });
  pages[0].drawLine({ start: { x: mm(20), y: mm(212) }, end: { x: mm(47), y: mm(212) }, thickness: 1.4, color: rgb(0.608, 0.788, 0.792) });

  profileOrder.forEach((code, index) => {
    const page = pages[1];
    const y = mm(166 - index * 29);
    page.drawRectangle({ x: mm(140), y: y - mm(4), width: mm(52), height: mm(12), color: rgb(1, 1, 1) });
    page.drawText(`${formatRelativePercentage(displayValues[code])} %`, { x: mm(141), y, size: 18, font: bold, color: rgb(0.08, 0.09, 0.09) });
  });
  pages[1].drawRectangle({ x: mm(20), y: mm(27), width: mm(170), height: mm(12), color: rgb(1, 1, 1) });
  pages[1].drawText("Répartition relative des quatre tendances · total 100 %.", { x: mm(20), y: mm(31), size: 8.8, font: regular, color: rgb(.38, .39, .42) });

  const identity = source.orientedCombinations[combinationId(primary, secondary)].pages["01_identite"];
  const identityPage = pages[2];
  identityPage.drawRectangle({ x: mm(102), y: mm(35), width: mm(93), height: mm(208), color: rgb(1, 1, 1) });
  let y = mm(224);
  identityPage.drawText(identity.heading, { x: mm(108), y, size: 19, font: bold, color: rgb(0.08, 0.09, 0.09) });
  y = drawWrapped(identityPage, regular, identity.summary, mm(108), y - mm(12), mm(78), 10.5, 15);
  y = drawWrapped(identityPage, bold, identity.synergy, mm(108), y - mm(8), mm(78), 10.5, 15);
  drawWrapped(identityPage, regular, identity.watchpoint, mm(108), y - mm(8), mm(78), 10.5, 15);

  pdf.setTitle(`Profil MAPP · ${fullName}`);
  pdf.setSubject(`Révision ${bundle.revision} · bibliothèque V10 ${INTEGRAL_V10_SOURCE_SHA256}`);
  pdf.setProducer("Profil MAPP · Ministry School");
  return response(new Uint8Array(await pdf.save()), fullName);
}
