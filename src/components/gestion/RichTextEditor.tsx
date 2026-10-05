"use client";

import { useRef, type ClipboardEvent } from "react";
import { Bold, Heading3, List, Underline } from "lucide-react";

type Props = {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
};

function htmlToCourseText(html: string) {
  const document = new DOMParser().parseFromString(html, "text/html");
  const convert = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    if (!(node instanceof HTMLElement)) return "";
    const tag = node.tagName.toLowerCase();
    const content = Array.from(node.childNodes).map(convert).join("");
    if (tag === "br") return "\n";
    if (/^h[1-6]$/.test(tag)) return `\n### ${content.trim()}\n`;
    if (tag === "li") return `- ${content.trim()}\n`;
    if (
      tag === "strong" ||
      tag === "b" ||
      /font-weight:\s*(bold|[6-9]00)/i.test(node.getAttribute("style") ?? "")
    )
      return `**${content}**`;
    if (
      tag === "u" ||
      /text-decoration[^:]*:\s*underline/i.test(
        node.getAttribute("style") ?? "",
      )
    )
      return `<u>${content}</u>`;
    if (tag === "p" || tag === "div") return `\n${content.trim()}\n`;
    return content;
  };
  return Array.from(document.body.childNodes)
    .map(convert)
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function RichTextEditor({
  name,
  defaultValue = "",
  placeholder,
  rows = 10,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function format(kind: "heading" | "list" | "bold" | "underline") {
    const area = ref.current;
    if (!area) return;
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const selected = area.value.slice(start, end);
    let replacement = selected;
    if (kind === "heading") replacement = `### ${selected || "Titre"}`;
    if (kind === "list")
      replacement = (selected || "Élément")
        .split("\n")
        .map((line) => `- ${line}`)
        .join("\n");
    if (kind === "bold") replacement = `**${selected || "texte en gras"}**`;
    if (kind === "underline")
      replacement = `<u>${selected || "texte souligné"}</u>`;
    area.setRangeText(replacement, start, end, "end");
    area.focus();
  }

  function pasteFormatted(event: ClipboardEvent<HTMLTextAreaElement>) {
    const html = event.clipboardData.getData("text/html");
    if (!html) return;
    const area = ref.current;
    if (!area) return;
    const converted = htmlToCourseText(html);
    if (!converted) return;
    event.preventDefault();
    area.setRangeText(converted, area.selectionStart, area.selectionEnd, "end");
  }

  const tool =
    "inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-foreground transition hover:bg-background";
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background sm:col-span-2">
      <div
        className="flex flex-wrap gap-1 border-b border-border-soft bg-surface p-1.5"
        role="toolbar"
        aria-label="Mise en forme du texte"
      >
        <button
          type="button"
          onClick={() => format("heading")}
          className={tool}
        >
          <Heading3 size={14} />
          Titre
        </button>
        <button type="button" onClick={() => format("list")} className={tool}>
          <List size={14} />
          Liste
        </button>
        <button type="button" onClick={() => format("bold")} className={tool}>
          <Bold size={14} />
          Gras
        </button>
        <button
          type="button"
          onClick={() => format("underline")}
          className={tool}
        >
          <Underline size={14} />
          Souligné
        </button>
      </div>
      <textarea
        ref={ref}
        name={name}
        required
        rows={rows}
        defaultValue={defaultValue}
        placeholder={placeholder}
        onPaste={pasteFormatted}
        className="w-full resize-y bg-background px-3 py-3 text-[15px] leading-6 text-foreground outline-none"
      />
      <p className="border-t border-border-soft px-3 py-2 text-xs text-muted">
        Tu peux aussi copier-coller un texte déjà mis en forme : titres, listes,
        gras et soulignés seront conservés.
      </p>
    </div>
  );
}
