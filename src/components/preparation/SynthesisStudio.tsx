"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type RefObject } from "react";
import {
  ArrowDown,
  ArrowUp,
  Bold,
  CornerDownLeft,
  Download,
  FileDown,
  FileText,
  LoaderCircle,
  Minus,
  Plus,
  Redo2,
  Underline,
  Undo2,
  Upload,
} from "lucide-react";
import {
  EDITABLE_PDF_ATTACHMENT_NAME,
  applyEditablePdfOperation,
  paginateEditablePdfBlocks,
  parseEditablePdfSource,
  type EditablePdfBlockV1,
  type EditablePdfOperation,
  type EditablePdfSourceV1,
} from "@/lib/preparation/editable-pdf-source";
import type { SynthesisDraft, TrainingSynthesis } from "@/lib/preparation/synthesis";
import PreparationModeTabs, { type PreparationMode } from "./PreparationModeTabs";

const A4 = { width: 720, height: 1018 };
const STRIPES = ["#c9dc6a", "#27bdc2", "#ee9a9c", "#f19f00", "#e34d1b"];

type StudioProps = {
  initialSynthesis: TrainingSynthesis;
  initialDrafts: SynthesisDraft[];
  draftsUnavailable: string | null;
  creatorName: string;
  onModeChange: (mode: PreparationMode) => void;
};

function sectionParts(text: string) {
  const match = text.match(/^(\d+)\.\s*([\s\S]*)$/);
  return match ? { label: `Section ${match[1].padStart(2, "0")}`, title: match[2] } : { label: "Section", title: text };
}

function rowsFor(block: EditablePdfBlockV1) {
  const characters = Math.max(24, Math.floor(72 * (9.5 / block.style.fontSize)));
  return block.text.split("\n").reduce((total, line) => total + Math.max(1, Math.ceil(line.length / characters)), 0);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function FloatingTools({ block, canMoveUp, canMoveDown, onOperation, onLineBreak }: {
  block: EditablePdfBlockV1;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onOperation: (operation: EditablePdfOperation) => void;
  onLineBreak: () => void;
}) {
  const keepFocus = (event: MouseEvent) => {
    if ((event.target as HTMLElement).closest("input")) return;
    event.preventDefault();
  };
  const commitFontSize = (value: string) => {
    const parsed = Number.parseFloat(value.replace(",", "."));
    if (Number.isFinite(parsed) && Math.abs(parsed - block.style.fontSize) >= 0.01) {
      onOperation({ type: "font-size-set", blockId: block.id, value: parsed });
    }
  };
  const button = "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-semibold text-white hover:bg-white/15 disabled:opacity-40";
  const activeButton = `${button} bg-white/20`;
  return <div role="toolbar" aria-label="Mise en forme du paragraphe" onMouseDown={keepFocus} className="absolute -top-12 left-0 z-30 flex w-max max-w-[620px] items-center gap-0.5 rounded-lg bg-[#202b2a] p-1 shadow-xl">
    <button type="button" title="Réduire la taille" aria-label="Réduire la taille" className={button} onClick={() => onOperation({ type: "font-size", blockId: block.id, delta: -1 })}><Minus size={14} /></button>
    <label className="flex h-8 items-center rounded-md bg-white/10 px-1.5 text-white"><span className="sr-only">Taille de police en points</span><input key={`${block.id}-${block.style.fontSize}`} type="number" min="6" max="72" step="0.5" inputMode="decimal" defaultValue={block.style.fontSize} onBlur={(event) => commitFontSize(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} className="w-11 border-0 bg-transparent p-0 text-center text-xs font-semibold text-white outline-none" /><span className="text-[9px] text-white/60">pt</span></label>
    <button type="button" title="Augmenter la taille" aria-label="Augmenter la taille" className={button} onClick={() => onOperation({ type: "font-size", blockId: block.id, delta: 1 })}><Plus size={14} /></button>
    <span className="mx-1 h-5 w-px bg-white/20" />
    <button type="button" title="Gras" aria-label="Gras" aria-pressed={!!block.style.bold} className={block.style.bold ? activeButton : button} onClick={() => onOperation({ type: "text-style", blockId: block.id, style: "bold", value: !block.style.bold })}><Bold size={14} /></button>
    <button type="button" title="Souligné" aria-label="Souligné" aria-pressed={!!block.style.underline} className={block.style.underline ? activeButton : button} onClick={() => onOperation({ type: "text-style", blockId: block.id, style: "underline", value: !block.style.underline })}><Underline size={14} /></button>
    <span className="mx-1 h-5 w-px bg-white/20" />
    <button type="button" title="Monter le bloc" aria-label="Monter le bloc" disabled={!canMoveUp} className={button} onClick={() => onOperation({ type: "move-block", blockId: block.id, direction: "up" })}><ArrowUp size={14} /></button>
    <button type="button" title="Descendre le bloc" aria-label="Descendre le bloc" disabled={!canMoveDown} className={button} onClick={() => onOperation({ type: "move-block", blockId: block.id, direction: "down" })}><ArrowDown size={14} /></button>
    <span className="mx-1 h-5 w-px bg-white/20" />
    <button type="button" title="Insérer un retour à la ligne au curseur" className={button} onClick={onLineBreak}><CornerDownLeft size={14} /><span className="ml-1.5 hidden sm:inline">Ligne</span></button>
    <button type="button" title={block.breakBefore ? "Retirer le saut de page" : "Envoyer à la page suivante"} className={button} onClick={() => onOperation({ type: "page-break", blockId: block.id, value: !block.breakBefore })}><FileDown size={14} /><span className="ml-1.5 hidden sm:inline">Page</span></button>
  </div>;
}

function EditableBlock({ block, selected, canMoveUp, canMoveDown, onSelect, onOperation, onLineBreak, textRef }: {
  block: EditablePdfBlockV1;
  selected: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSelect: () => void;
  onOperation: (operation: EditablePdfOperation) => void;
  onLineBreak: () => void;
  textRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const fontSize = block.style.fontSize * 1.34;
  const rows = rowsFor(block);
  const textStyle: CSSProperties = {
    color: block.style.color,
    fontFamily: block.style.fontRole === "display" ? "var(--font-title)" : "var(--font-body)",
    fontSize,
    lineHeight: block.style.lineHeight,
    fontWeight: block.style.bold ? 700 : 400,
    textDecoration: block.style.underline ? "underline" : "none",
    height: Math.max(fontSize * block.style.lineHeight * rows + 3, fontSize * 1.4),
  };
  const wrapperStyle: CSSProperties = {
    marginTop: block.style.spaceBefore * 1.15,
    marginBottom: block.style.spaceAfter * 1.15,
  };
  const textarea = <textarea
    ref={selected ? textRef : undefined}
    readOnly
    value={block.text}
    aria-label={`Texte : ${block.text.slice(0, 60)}`}
    onFocus={onSelect}
    onClick={(event) => { event.stopPropagation(); onSelect(); }}
    style={textStyle}
    className="block w-full cursor-text resize-none overflow-hidden border-0 bg-transparent p-0 outline-none selection:bg-[#27bdc2]/30"
  />;

  return <div data-editable-pdf-block={block.id} className={`relative rounded-sm ${selected ? "ring-2 ring-[#27bdc2]/70 ring-offset-4 ring-offset-[#fffcf7]" : "hover:ring-1 hover:ring-black/15"}`} style={wrapperStyle} onClick={onSelect}>
    {selected ? <FloatingTools block={block} canMoveUp={canMoveUp} canMoveDown={canMoveDown} onOperation={onOperation} onLineBreak={onLineBreak} /> : null}
    {block.breakBefore ? <span className="absolute -top-3 right-0 text-[7px] font-semibold uppercase tracking-[0.12em] text-[#27a8bd]">Saut de page</span> : null}
    {block.kind === "title" ? (() => {
      const section = sectionParts(block.text);
      return <div className="pb-4"><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#27a8bd]">{section.label}</p><textarea ref={selected ? textRef : undefined} readOnly value={section.title} aria-label={`Titre : ${section.title}`} onFocus={onSelect} onClick={(event) => { event.stopPropagation(); onSelect(); }} style={{ ...textStyle, height: Math.max(58, textStyle.height as number) }} className="block w-full cursor-text resize-none overflow-hidden border-0 bg-transparent p-0 font-title outline-none selection:bg-[#27bdc2]/30" /><div className="mx-auto mt-5 h-[3px] w-16 bg-[#27bdc2]" /></div>;
    })() : block.kind === "list-item" ? <div className="flex gap-3"><span className={`pt-0.5 text-sm font-bold ${(block.listLevel ?? 0) > 0 ? "text-[#f19f00]" : "text-[#27bdc2]"}`}>{(block.listLevel ?? 0) > 0 ? "–" : "•"}</span>{textarea}</div> : block.kind === "quote" ? <div className="border border-[#d9d7d0] border-l-4 border-l-[#27bdc2] bg-white px-5 py-4">{textarea}</div> : textarea}
  </div>;
}

export default function SynthesisStudio({ onModeChange }: StudioProps) {
  const [source, setSource] = useState<EditablePdfSourceV1 | null>(null);
  const [past, setPast] = useState<EditablePdfSourceV1[]>([]);
  const [future, setFuture] = useState<EditablePdfSourceV1[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<"import" | "demo" | "export" | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [readonlyUrl, setReadonlyUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const [zoom, setZoom] = useState(0.78);
  const fileInput = useRef<HTMLInputElement>(null);
  const selectedText = useRef<HTMLTextAreaElement>(null);
  const pages = useMemo(() => source ? paginateEditablePdfBlocks(source.blocks) : [], [source]);
  const blockPositions = useMemo(() => new Map(source?.blocks.map((block, index) => [block.id, index]) ?? []), [source]);

  useEffect(() => () => { if (readonlyUrl) URL.revokeObjectURL(readonlyUrl); }, [readonlyUrl]);

  const replaceReadonlyUrl = (next: string | null) => {
    setReadonlyUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return next;
    });
  };

  const installSource = (next: EditablePdfSourceV1, name: string, success = "PDF compatible chargé. Cliquez directement sur un texte.") => {
    replaceReadonlyUrl(null);
    setSource(next);
    setPast([]);
    setFuture([]);
    setSelectedId(null);
    setFilename(name);
    setMessage({ type: "success", text: success });
  };

  const readCompatibleSource = async (blob: Blob) => {
    const {
      PDFArray,
      PDFDict,
      PDFDocument,
      PDFHexString,
      PDFName,
      PDFRawStream,
      PDFString,
      decodePDFRawStream,
    } = await import("pdf-lib");
    const document = await PDFDocument.load(new Uint8Array(await blob.arrayBuffer()));
    const names = document.catalog.lookupMaybe(PDFName.of("Names"), PDFDict);
    const embeddedFiles = names?.lookupMaybe(PDFName.of("EmbeddedFiles"), PDFDict);
    const attachments = embeddedFiles?.lookupMaybe(PDFName.of("Names"), PDFArray);

    for (let index = 0; index < (attachments?.size() ?? 0); index += 2) {
      const rawName = attachments!.lookup(index);
      const name = rawName instanceof PDFString || rawName instanceof PDFHexString ? rawName.decodeText() : "";
      if (name !== EDITABLE_PDF_ATTACHMENT_NAME) continue;
      const fileSpec = attachments!.lookup(index + 1, PDFDict);
      const embeddedFile = fileSpec.lookup(PDFName.of("EF"), PDFDict);
      const stream = embeddedFile.lookup(PDFName.of("F"));
      if (!(stream instanceof PDFRawStream)) throw new Error("La source intégrée au PDF est illisible.");
      return parseEditablePdfSource(decodePDFRawStream(stream).decode());
    }

    throw new Error("Ce PDF ne contient pas la source Ministry School nécessaire pour déplacer le texte sans l’abîmer.");
  };

  const convertPdfToSource = async (file: File) => {
    const endpoint = window.location.pathname === "/preview/editable-pdf-proof"
      ? "/api/preview/editable-pdf-proof"
      : "/api/admin/preparation/editable-pdf/import";
    const form = new FormData();
    form.set("file", file);
    const response = await fetch(endpoint, { method: "POST", body: form });
    const result = await response.json().catch(() => null) as { source?: unknown; warning?: string; error?: string } | null;
    if (!response.ok || !result?.source) throw new Error(result?.error || (response.redirected ? "Votre session a expiré. Reconnectez-vous avant d’importer." : "Ce PDF n’a pas pu être converti."));
    return { source: parseEditablePdfSource(JSON.stringify(result.source)), warning: result.warning };
  };

  const importPdf = async (file: File) => {
    setBusy("import");
    setMessage(null);
    try {
      try {
        installSource(await readCompatibleSource(file), file.name);
      } catch {
        const converted = await convertPdfToSource(file);
        installSource(converted.source, file.name, `${converted.warning ?? "PDF converti sans réécriture."} Cliquez sur un texte pour l’ajuster.`);
      }
    } catch (error) {
      setSource(null);
      setPast([]);
      setFuture([]);
      replaceReadonlyUrl(URL.createObjectURL(file));
      setFilename(file.name);
      setMessage({ type: "error", text: error instanceof Error ? `${error.message} Il reste affiché en lecture seule.` : "PDF incompatible." });
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const loadDemo = async () => {
    setBusy("demo");
    setMessage(null);
    try {
      const response = await fetch("/api/preview/editable-pdf-proof");
      if (!response.ok) throw new Error("L’exemple n’est pas disponible.");
      const blob = await response.blob();
      installSource(await readCompatibleSource(blob), "Ministry-School-Nathalie.pdf");
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Chargement impossible." });
    } finally { setBusy(null); }
  };

  const commitOperation = (operation: EditablePdfOperation) => {
    setSource((current) => {
      if (!current) return current;
      const next = applyEditablePdfOperation(current, operation);
      setPast((history) => [...history.slice(-49), current]);
      setFuture([]);
      return next;
    });
  };

  const insertLineBreak = () => {
    if (!source || !selectedId) return;
    const block = source.blocks.find((item) => item.id === selectedId);
    if (!block) return;
    const titlePrefixLength = block.kind === "title" ? block.text.length - sectionParts(block.text).title.length : 0;
    const index = (selectedText.current?.selectionStart ?? block.text.length) + titlePrefixLength;
    commitOperation({ type: "line-break", blockId: selectedId, index });
    window.setTimeout(() => {
      selectedText.current?.focus();
      selectedText.current?.setSelectionRange(index + 1, index + 1);
    });
  };

  const undo = () => {
    if (!source || !past.length) return;
    const previous = past.at(-1)!;
    setPast((history) => history.slice(0, -1));
    setFuture((history) => [source, ...history].slice(0, 50));
    setSource(previous);
  };

  const redo = () => {
    if (!source || !future.length) return;
    const next = future[0];
    setFuture((history) => history.slice(1));
    setPast((history) => [...history.slice(-49), source]);
    setSource(next);
  };

  const exportPdf = async () => {
    if (!source) return;
    setBusy("export");
    setMessage(null);
    try {
      const endpoint = window.location.pathname === "/preview/editable-pdf-proof"
        ? "/api/preview/editable-pdf-proof"
        : "/api/admin/preparation/editable-pdf";
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source }) });
      const result = response.ok ? null : await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error || "Export impossible.");
      if (!response.headers.get("content-type")?.includes("application/pdf")) {
        throw new Error(response.redirected ? "Votre session a expiré. Reconnectez-vous avant d’exporter." : "Le serveur n’a pas renvoyé un PDF valide.");
      }
      downloadBlob(await response.blob(), `Ministry-School-Synthese-${source.document.date}.pdf`);
      setMessage({ type: "success", text: "PDF exporté avec sa source éditable." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Export impossible." });
    } finally { setBusy(null); }
  };

  return <div className="-mx-4 -mt-2 sm:-mx-7">
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 px-4 pb-4 pt-1 backdrop-blur sm:px-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="label text-[10px] text-link">Éditeur PDF simple</p><h1 className="font-title mt-1 text-[30px] leading-tight sm:text-[36px]">Préparation</h1><p className="mt-1 text-sm text-muted">Importez le PDF, cliquez sur un texte, ajustez-le.</p><PreparationModeTabs mode="synthesis" onChange={onModeChange} /></div>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileInput} type="file" accept=".pdf,application/pdf" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importPdf(file); }} />
          <button type="button" onClick={() => fileInput.current?.click()} disabled={!!busy} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-semibold hover:border-foreground disabled:opacity-50">{busy === "import" ? <LoaderCircle className="animate-spin" size={16} /> : <Upload size={16} />} Importer un PDF</button>
          <button type="button" onClick={loadDemo} disabled={!!busy} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-semibold hover:border-foreground disabled:opacity-50">{busy === "demo" ? <LoaderCircle className="animate-spin" size={16} /> : <FileText size={16} />} Exemple Nathalie</button>
          <div className="flex rounded-lg border border-border bg-background p-1"><button type="button" onClick={undo} disabled={!past.length} aria-label="Annuler" className="rounded-md p-2 hover:bg-surface disabled:opacity-30"><Undo2 size={16} /></button><button type="button" onClick={redo} disabled={!future.length} aria-label="Rétablir" className="rounded-md p-2 hover:bg-surface disabled:opacity-30"><Redo2 size={16} /></button></div>
          <button type="button" onClick={exportPdf} disabled={!source || !!busy} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent disabled:opacity-50">{busy === "export" ? <LoaderCircle className="animate-spin" size={16} /> : <Download size={16} />} Exporter</button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted"><span>{filename || "Aucun PDF chargé"}</span><div className="flex items-center gap-1"><button type="button" aria-label="Zoom arrière" onClick={() => setZoom((value) => Math.max(0.45, Number((value - 0.08).toFixed(2))))} className="rounded-md p-2 hover:bg-surface"><Minus size={14} /></button><span className="min-w-11 text-center font-semibold">{Math.round(zoom * 100)}%</span><button type="button" aria-label="Zoom avant" onClick={() => setZoom((value) => Math.min(1.1, Number((value + 0.08).toFixed(2))))} className="rounded-md p-2 hover:bg-surface"><Plus size={14} /></button></div></div>
      {message ? <p role="status" className={`mt-3 rounded-lg border px-3 py-2 text-sm ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-950"}`}>{message.text}</p> : null}
    </header>

    <main className="min-h-[calc(100vh-180px)] overflow-auto bg-[#e9e5dd] p-4 sm:p-7" onClick={() => setSelectedId(null)}>
      {!source && !readonlyUrl ? <section className="mx-auto grid min-h-[560px] max-w-3xl place-items-center rounded-2xl border-2 border-dashed border-black/15 bg-white/60 p-8 text-center"><div><Upload className="mx-auto text-[#27a8bd]" size={34} /><h2 className="font-title mt-5 text-3xl">Déposez votre PDF Ministry School</h2><p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted">Le PDF doit contenir sa source structurée. Utilisez « Exemple Nathalie » pour essayer immédiatement.</p><button type="button" onClick={() => fileInput.current?.click()} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-5 text-sm font-semibold text-on-accent"><Upload size={16} /> Choisir un PDF</button></div></section> : null}
      {!source && readonlyUrl ? <section className="mx-auto max-w-5xl"><div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><strong>Lecture seule.</strong> Ce PDF ne contient pas les paragraphes structurés nécessaires pour modifier les tailles et les sauts sans dégrader sa mise en page.</div><iframe title="PDF importé en lecture seule" src={readonlyUrl} className="h-[78vh] w-full rounded-xl border-0 bg-white shadow-xl" /></section> : null}
      {source ? <div className="mx-auto w-max max-w-full">
        <div className="mb-4 rounded-xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-[#34403d] shadow-sm"><strong>Cliquez dans un texte</strong> pour choisir sa taille, le mettre en gras ou le souligner. Les flèches déplacent le bloc et la pagination se recalcule seule.</div>
        <div style={{ width: A4.width * zoom, height: A4.height * zoom }} className="mx-auto mb-6"><article className="relative origin-top-left overflow-hidden bg-[#25302f] text-[#fff0dc] shadow-2xl" style={{ width: A4.width, height: A4.height, transform: `scale(${zoom})` }}><div className="absolute inset-x-0 top-0 flex h-8">{STRIPES.map((color) => <span key={color} className="flex-1" style={{ backgroundColor: color }} />)}</div><Image src="/logo-compact.png" alt="Ministry School" width={466} height={122} className="absolute left-1/2 top-24 h-auto w-[260px] -translate-x-1/2" /><div className="absolute left-[84px] right-[84px] top-[300px]"><p className="text-[11px] font-bold uppercase tracking-[0.12em]">{source.document.category ?? "Synthèse de cours"} · 2026–2027</p><h2 className="mt-20 max-w-[570px] font-title text-[52px] leading-[1.06]">{source.document.title}</h2><div className="mt-24 h-1 w-36 rounded-full bg-[#27bdc2]" /></div><div className="absolute bottom-24 left-[84px] right-[84px]"><p className="text-sm font-bold uppercase">{source.document.speakers.join(" · ")}</p><p className="mt-4 text-xs">{source.document.schedule ?? source.document.date}{source.document.location ? ` · ${source.document.location}` : ""}</p></div></article></div>
        {pages.map((page, pageIndex) => <div key={pageIndex} style={{ width: A4.width * zoom, height: A4.height * zoom }} className="mx-auto mb-6 [contain-intrinsic-size:1018px] [content-visibility:auto]"><article className="relative origin-top-left overflow-hidden bg-[#fffcf7] text-[#25302f] shadow-2xl" style={{ width: A4.width, height: A4.height, transform: `scale(${zoom})` }} onClick={(event) => event.stopPropagation()}><div className="absolute inset-x-0 top-0 flex h-3">{STRIPES.map((color) => <span key={color} className="flex-1" style={{ backgroundColor: color }} />)}</div><header className="absolute left-[76px] right-[76px] top-10 flex justify-between text-[8px] uppercase text-[#68706f]"><strong>MINISTRY SCHOOL</strong><span>{source.document.title}</span></header><main className="absolute bottom-[72px] left-[92px] right-[92px] top-[90px]">{page.continuationOf ? <p className="mb-7 text-[10px] font-bold uppercase tracking-[0.16em] text-[#27a8bd]">{sectionParts(page.continuationOf).label} · suite</p> : null}{page.blocks.map((block) => { const position = blockPositions.get(block.id) ?? 0; return <EditableBlock key={block.id} block={block} selected={selectedId === block.id} canMoveUp={position > 0} canMoveDown={position < source.blocks.length - 1} onSelect={() => setSelectedId(block.id)} onOperation={commitOperation} onLineBreak={insertLineBreak} textRef={selectedText} />; })}</main><footer className="absolute bottom-7 left-[76px] right-[76px] flex justify-between border-t border-[#d9d7d0] pt-3 text-[8px] uppercase text-[#68706f]"><span>{source.document.speakers.join(" · ")} · {source.document.date}</span><span>{String(pageIndex + 1).padStart(2, "0")} / {String(pages.length).padStart(2, "0")}</span></footer></article></div>)}
      </div> : null}
    </main>
  </div>;
}
