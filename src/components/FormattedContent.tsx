import type { ReactNode } from "react";

function inlineMarkup(value: string) {
  const parts = value.split(/(\*\*[^*]+\*\*|<u>.*?<\/u>)/gi);
  return parts.map((part, index): ReactNode => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    if (/^<u>.*<\/u>$/i.test(part)) {
      return <u key={index} className="decoration-1 underline-offset-2">{part.slice(3, -4)}</u>;
    }
    return part;
  });
}

type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "paragraph"; text: string };

function blocksOf(source: string) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let items: string[] = [];
  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    if (text) blocks.push({ kind: "paragraph", text });
    paragraph = [];
  };
  const flushItems = () => {
    if (items.length) blocks.push({ kind: "list", items });
    items = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    const item = line.match(/^[-•]\s+(.+)$/);
    if (!line) {
      flushParagraph();
      flushItems();
    } else if (heading) {
      flushParagraph();
      flushItems();
      blocks.push({ kind: "heading", level: heading[1].length, text: heading[2] });
    } else if (item) {
      flushParagraph();
      items.push(item[1]);
    } else {
      flushItems();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushItems();
  return blocks;
}

export function plainTextContent(value: string) {
  return value
    .replace(/^#{1,4}\s+/gm, "")
    .replace(/^[-•]\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/<\/?u>/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function FormattedContent({ value, compact = false }: { value: string; compact?: boolean }) {
  return (
    <div className={compact ? "space-y-3 text-sm leading-7 text-muted" : "space-y-5 text-[17px] leading-8 text-foreground"}>
      {blocksOf(value).map((block, index) => {
        if (block.kind === "heading") {
          return <h3 key={index} className={`${compact ? "text-lg" : "text-[22px] sm:text-[24px]"} font-title font-semibold leading-tight text-foreground`}>{inlineMarkup(block.text)}</h3>;
        }
        if (block.kind === "list") {
          return <ul key={index} className="space-y-2">{block.items.map((item, itemIndex) => <li key={itemIndex} className="flex items-start gap-3"><span className="mt-[.62em] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" /><span>{inlineMarkup(item)}</span></li>)}</ul>;
        }
        return <p key={index}>{inlineMarkup(block.text)}</p>;
      })}
    </div>
  );
}
