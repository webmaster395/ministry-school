import {
  EDITABLE_PDF_SCHEMA,
  EDITABLE_PDF_VERSION,
  type EditablePdfBlockV1,
  type EditablePdfSourceV1,
} from "./editable-pdf-source.ts";

export type ExtractedPdfTextItem = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
};

export type ExtractedPdfPage = {
  pageNumber: number;
  width: number;
  height: number;
  items: ExtractedPdfTextItem[];
};

type PdfMetadata = {
  title?: string;
  author?: string;
  subject?: string;
};

type TextLine = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontNames: string[];
};

const FRENCH_MONTHS: Record<string, string> = {
  janvier: "01", fevrier: "02", février: "02", mars: "03", avril: "04", mai: "05", juin: "06",
  juillet: "07", aout: "08", août: "08", septembre: "09", octobre: "10", novembre: "11", decembre: "12", décembre: "12",
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function filenameTitle(filename: string) {
  return filename
    .replace(/\.pdf$/i, "")
    .replace(/^Ministry[- ]School[- ]*/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "Synthèse de cours";
}

function dateFromText(value: string) {
  const iso = /\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/.exec(value);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const compact = /(?:^|\D)(20\d{2})(\d{2})(\d{2})(?:\D|$)/.exec(value);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  const french = /\b(\d{1,2})\s+([a-zàâçéèêëîïôûùüÿñæœ]+)\s+(20\d{2})\b/i.exec(value);
  if (!french) return null;
  const month = FRENCH_MONTHS[french[2].toLowerCase()];
  return month ? `${french[3]}-${month}-${french[1].padStart(2, "0")}` : null;
}

function textLines(page: ExtractedPdfPage) {
  const contentTop = page.height - 48;
  const items = page.items
    .filter((item) => normalizeText(item.text) && item.y > 48 && item.y < contentTop)
    .sort((left, right) => right.y - left.y || left.x - right.x);
  const rows: ExtractedPdfTextItem[][] = [];
  for (const item of items) {
    const row = rows.find((candidate) => Math.abs(candidate[0].y - item.y) <= Math.max(2.4, item.height * 0.2));
    if (row) row.push(item);
    else rows.push([item]);
  }
  return rows
    .map((row) => {
      row.sort((left, right) => left.x - right.x);
      let text = "";
      let previousEnd = row[0].x;
      for (const item of row) {
        const segment = normalizeText(item.text);
        if (!segment) continue;
        const gap = item.x - previousEnd;
        const separator = !text ? "" : gap > 28 ? " — " : gap > 1.2 && !/^[,.;:!?%)\]]/.test(segment) ? " " : "";
        text += `${separator}${segment}`;
        previousEnd = item.x + item.width;
      }
      const x = Math.min(...row.map((item) => item.x));
      const end = Math.max(...row.map((item) => item.x + item.width));
      return {
        text: normalizeText(text),
        x,
        y: Math.max(...row.map((item) => item.y)),
        width: end - x,
        height: Math.max(...row.map((item) => item.height)),
        fontNames: [...new Set(row.map((item) => item.fontName))],
      } satisfies TextLine;
    })
    .filter((line) => line.text);
}

function mostCommonBodyFont(pages: ExtractedPdfPage[]) {
  const counts = new Map<string, number>();
  for (const page of pages.slice(1)) {
    for (const item of page.items) {
      if (item.y <= 48 || item.y >= page.height - 48 || item.height < 8 || item.height > 14) continue;
      counts.set(item.fontName, (counts.get(item.fontName) ?? 0) + normalizeText(item.text).length);
    }
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? "";
}

function styleFor(kind: EditablePdfBlockV1["kind"], fontSize: number): EditablePdfBlockV1["style"] {
  if (kind === "title") return { fontRole: "display", fontSize, lineHeight: 1.13, color: "#25302f", spaceBefore: 0, spaceAfter: 22 };
  if (kind === "heading") return { fontRole: "body", fontSize, lineHeight: 1.25, color: "#27a8bd", spaceBefore: 8, spaceAfter: 8 };
  if (kind === "quote") return { fontRole: "display", fontSize, lineHeight: 1.35, color: "#25302f", spaceBefore: 10, spaceAfter: 12 };
  return { fontRole: "body", fontSize, lineHeight: 1.45, color: "#25302f", spaceBefore: 0, spaceAfter: 9 };
}

function pageBlocks(page: ExtractedPdfPage, bodyFont: string) {
  const lines = textLines(page);
  const blocks: EditablePdfBlockV1[] = [];
  let sectionNumber = "";
  let index = 0;

  const add = (kind: EditablePdfBlockV1["kind"], text: string, size: number, listLevel?: number) => {
    const block: EditablePdfBlockV1 = {
      id: `imported-${String(page.pageNumber).padStart(3, "0")}-${String(++index).padStart(3, "0")}`,
      kind,
      text: normalizeText(text),
      style: styleFor(kind, size),
      breakBefore: false,
      ...(listLevel === undefined ? {} : { listLevel }),
    };
    blocks.push(block);
  };

  for (let cursor = 0; cursor < lines.length;) {
    const line = lines[cursor];
    const section = /^SECTION\s+(\d+)/i.exec(line.text);
    if (section) {
      sectionNumber = String(Number(section[1]));
      cursor += 1;
      continue;
    }

    if (line.height >= 17) {
      const parts = [line.text];
      let next = cursor + 1;
      while (next < lines.length && lines[next].height >= 17 && line.y - lines[next].y <= 80) {
        parts.push(lines[next].text);
        next += 1;
      }
      const title = `${sectionNumber ? `${sectionNumber}. ` : ""}${parts.join(" ")}`;
      add("title", title, clamp(Math.round(line.height * 0.92), 18, 29));
      sectionNumber = "";
      cursor = next;
      continue;
    }

    const onlyNonBodyFont = !!bodyFont && line.fontNames.every((font) => font !== bodyFont);
    const nextLine = lines[cursor + 1];
    const isStandaloneShortHeading = line.height >= 11.2
      && line.text.length <= 70
      && !!nextLine
      && line.y - nextLine.y > 17.5;
    const isHeading = (onlyNonBodyFont && line.text.length <= 100 && line.height >= 9.5) || isStandaloneShortHeading;
    const isQuote = line.height >= 13 && /[«»“”]/.test(line.text);
    if (isHeading || isQuote) {
      const parts = [line.text];
      let next = cursor + 1;
      if (!isQuote) {
        while (next < lines.length) {
          const candidate = lines[next];
          const gap = lines[next - 1].y - candidate.y;
          if (candidate.height < 11.2 || Math.abs(candidate.height - line.height) > 1.5 || gap > 22 || /^SECTION\s+\d+/i.test(candidate.text)) break;
          parts.push(candidate.text);
          next += 1;
        }
      }
      add(isQuote ? "quote" : "heading", parts.join(" "), clamp(Number((line.height * 0.9).toFixed(1)), isQuote ? 11 : 9.5, isQuote ? 16 : 14));
      cursor = next;
      continue;
    }

    const parts = [line.text];
    let next = cursor + 1;
    let previous = line;
    while (next < lines.length) {
      const candidate = lines[next];
      if (/^SECTION\s+\d+/i.test(candidate.text) || candidate.height >= 17) break;
      const candidateNonBody = !!bodyFont && candidate.fontNames.every((font) => font !== bodyFont);
      if (candidateNonBody && candidate.text.length <= 100 && candidate.height >= 9.5) break;
      const verticalGap = previous.y - candidate.y;
      if (verticalGap > Math.max(17.5, previous.height * 1.55)) break;
      parts.push(candidate.text);
      previous = candidate;
      next += 1;
    }
    const text = parts.join(" ");
    const bullet = /^[•●▪◦*-]\s+/.test(text);
    add(bullet ? "list-item" : "paragraph", bullet ? text.replace(/^[•●▪◦*-]\s+/, "") : text, clamp(Number((line.height * 0.88).toFixed(1)), 8.5, 11.5), bullet ? 0 : undefined);
    cursor = next;
  }
  return blocks;
}

export function buildEditablePdfSourceFromPages(input: {
  pages: ExtractedPdfPage[];
  metadata?: PdfMetadata;
  filename: string;
}) {
  const coverLines = input.pages[0] ? textLines({ ...input.pages[0], items: input.pages[0].items.filter((item) => item.y > 48) }) : [];
  const coverText = coverLines.map((line) => line.text).join(" · ");
  const title = normalizeText(input.metadata?.title ?? "")
    || coverLines.filter((line) => line.height >= 18).map((line) => line.text).join(" ")
    || filenameTitle(input.filename);
  const author = normalizeText(input.metadata?.author ?? "")
    || coverLines.find((line) => /[A-ZÀ-ÖØ-Þ]{3,}/.test(line.text) && line.height >= 9 && line.height < 18)?.text
    || "Ministry School";
  const date = dateFromText(`${coverText} ${input.filename}`) ?? new Date().toISOString().slice(0, 10);
  const bodyFont = mostCommonBodyFont(input.pages);
  const contentPages = input.pages.length > 1 ? input.pages.slice(1) : input.pages;
  const extractedBlocks = contentPages.flatMap((page) => pageBlocks(page, bodyFont));
  const blocks: EditablePdfBlockV1[] = [];
  for (const block of extractedBlocks) {
    const previous = blocks.at(-1);
    if (block.kind === "title" && previous?.kind === "title" && /^\d+\.\s/.test(previous.text) && !/^\d+\.\s/.test(block.text)) {
      previous.text = `${previous.text} ${block.text}`;
      continue;
    }
    blocks.push(block);
  }
  if (!blocks.length) throw new Error("Aucun texte structurable n’a été trouvé dans ce PDF.");

  return {
    schema: EDITABLE_PDF_SCHEMA,
    version: EDITABLE_PDF_VERSION,
    sourceId: `pdf-import-${crypto.randomUUID()}`,
    sourceNotice: "Source structurée reconstruite automatiquement depuis le texte du PDF importé, sans IA ni réécriture.",
    document: {
      title,
      date,
      speakers: [author],
      schedule: coverLines.find((line) => dateFromText(line.text))?.text,
      category: "Synthèse de cours",
    },
    template: {
      id: "ministry-editorial-anthracite",
      version: 1,
      pageSize: "A4",
      assetSet: "ministry-school-2026",
    },
    blocks,
  } satisfies EditablePdfSourceV1;
}

export async function extractEditablePdfSourceFromPdf(bytes: Uint8Array, filename: string) {
  const { extractTextItems, getDocumentProxy, getMeta } = await import("unpdf");
  const document = await getDocumentProxy(bytes);
  const [structuredText, metadataResult] = await Promise.all([
    extractTextItems(document),
    getMeta(document).catch(() => null),
  ]);
  const info = metadataResult?.info;
  const pages: ExtractedPdfPage[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    pages.push({
      pageNumber,
      width: viewport.width,
      height: viewport.height,
      items: structuredText.items[pageNumber - 1].flatMap((item) => {
        if (!normalizeText(item.str)) return [];
        return [{
          text: item.str,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          fontName: item.fontFamily,
        }];
      }),
    });
  }
  await document.cleanup();
  return {
    source: buildEditablePdfSourceFromPages({
      pages,
      filename,
      metadata: { title: info?.Title, author: info?.Author, subject: info?.Subject },
    }),
    pageCount: pages.length,
  };
}
