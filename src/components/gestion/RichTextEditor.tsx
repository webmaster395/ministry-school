"use client";

import { useRef } from "react";
import { Bold, Heading3, List, Underline } from "lucide-react";

type Props = {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
};

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
        className="w-full resize-y bg-background px-3 py-3 text-[15px] leading-6 text-foreground outline-none"
      />
    </div>
  );
}
