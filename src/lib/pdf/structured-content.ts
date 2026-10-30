export type PdfContentBlock =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; start: number; items: string[] };

const decodeEntities = (value: string) => value
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">")
  .replace(/&quot;/gi, '"')
  .replace(/&#(?:39|x27);/gi, "'")
  .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
  .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)));

export function pdfPlainText(value: string) {
  return decodeEntities(value)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1")
    .replace(/(?<!_)_([^_]+)_(?!_)/g, "$1")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function htmlListsToSource(value: string) {
  return value
    .replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (_, body: string) => {
      let index = 0;
      const items = Array.from(body.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi));
      return `\n${items.map((item) => `${++index}. ${pdfPlainText(item[1])}`).join("\n")}\n`;
    })
    .replace(/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi, (_, body: string) => {
      const items = Array.from(body.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi));
      return `\n${items.map((item) => `- ${pdfPlainText(item[1])}`).join("\n")}\n`;
    });
}

function sourceOf(value: string) {
  return htmlListsToSource(value)
    .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level: string, text: string) => `\n${"#".repeat(Number(level))} ${pdfPlainText(text)}\n`)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div)>/gi, "\n\n")
    .replace(/<(?:p|div)\b[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\r\n?/g, "\n");
}

export function pdfContentBlocks(value: string): PdfContentBlock[] {
  const lines = sourceOf(value).split("\n");
  const blocks: PdfContentBlock[] = [];
  let paragraph: string[] = [];
  let list: Extract<PdfContentBlock, { kind: "list" }> | null = null;

  const flushParagraph = () => {
    const text = paragraph.map(pdfPlainText).filter(Boolean).join("\n");
    if (text) blocks.push({ kind: "paragraph", text });
    paragraph = [];
  };
  const flushList = () => {
    if (list?.items.length) blocks.push(list);
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    const unordered = line.match(/^[-+*•]\s+(.+)$/);
    const ordered = line.match(/^(\d+)[.)]\s+(.+)$/);

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "heading", level: heading[1].length, text: pdfPlainText(heading[2]) });
      continue;
    }
    if (unordered || ordered) {
      flushParagraph();
      const isOrdered = !!ordered;
      const item = pdfPlainText((ordered ?? unordered)![2] ?? unordered![1]);
      const start = ordered ? Number(ordered[1]) : 1;
      if (!list || list.ordered !== isOrdered) {
        flushList();
        list = { kind: "list", ordered: isOrdered, start, items: [] };
      }
      list.items.push(item);
      continue;
    }
    if (list && /^\s+/.test(raw) && list.items.length) {
      list.items[list.items.length - 1] = `${list.items.at(-1)} ${pdfPlainText(line)}`;
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return blocks;
}
