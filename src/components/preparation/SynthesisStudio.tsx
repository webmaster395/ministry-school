"use client";

import { useDeferredValue, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileText,
  ImageDown,
  LoaderCircle,
  Minus,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import {
  deleteSynthesisDraft,
  duplicateSynthesisDraft,
  saveSynthesisDraft,
} from "@/app/gestion/preparation/actions";
import { MINISTRY_PROGRAM_COLORS } from "@/lib/preparation/program";
import {
  blocksFromPastedText,
  createEmptySynthesis,
  formatSynthesisDate,
  normalizeTrainingSynthesis,
  type SynthesisBlock,
  type SynthesisDraft,
  type TrainingSynthesis,
} from "@/lib/preparation/synthesis";
import PreparationModeTabs, { type PreparationMode } from "./PreparationModeTabs";
import SynthesisPreview from "./SynthesisPreview";

const fieldClass = "mt-1 min-h-11 w-full rounded-lg border border-border px-3 py-2.5 text-sm";

function newBlock(type: SynthesisBlock["type"] = "paragraph"): SynthesisBlock {
  return { id: crypto.randomUUID(), type, level: 1, text: "", color: "#59c9ca" };
}

function BlockEditor({ block, index, count, onChange, onMove, onDelete }: {
  block: SynthesisBlock;
  index: number;
  count: number;
  onChange: (patch: Partial<SynthesisBlock>) => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}) {
  return <article className="rounded-xl border border-border bg-background p-3 [content-visibility:auto] [contain-intrinsic-size:180px]">
    <div className="flex flex-wrap items-center gap-2">
      <select value={block.type} onChange={(event) => onChange({ type: event.target.value as SynthesisBlock["type"] })} aria-label={`Type du bloc ${index + 1}`} className="min-h-9 rounded-lg border border-border bg-background px-2 text-xs font-semibold">
        <option value="heading">Titre</option><option value="paragraph">Paragraphe</option><option value="bullet">Liste</option><option value="quote">Citation</option>
      </select>
      {block.type === "heading" ? <div className="flex rounded-lg border border-border p-0.5" aria-label="Niveau du titre">{([1, 2, 3] as const).map((level) => <button key={level} type="button" onClick={() => onChange({ level })} className={`h-8 min-w-8 rounded-md text-xs font-semibold ${block.level === level ? "bg-accent text-on-accent" : "text-muted"}`}>T{level}</button>)}</div> : null}
      <span className="ml-auto text-[10px] text-muted">{index + 1}/{count}</span>
      <button type="button" aria-label="Monter" disabled={index === 0} onClick={() => onMove(-1)} className="rounded-md p-1.5 text-muted hover:bg-surface disabled:opacity-30"><ArrowUp size={14} /></button>
      <button type="button" aria-label="Descendre" disabled={index === count - 1} onClick={() => onMove(1)} className="rounded-md p-1.5 text-muted hover:bg-surface disabled:opacity-30"><ArrowDown size={14} /></button>
      <button type="button" aria-label="Supprimer" onClick={onDelete} className="rounded-md p-1.5 text-red-700 hover:bg-red-50"><Trash2 size={14} /></button>
    </div>
    {block.type === "heading" ? <div className="mt-3 flex flex-wrap gap-2" aria-label="Couleur du titre">{MINISTRY_PROGRAM_COLORS.map((color) => <button key={color.value} type="button" title={color.label} aria-label={`Couleur ${color.label}`} aria-pressed={block.color === color.value} onClick={() => onChange({ color: color.value })} className={`h-7 w-7 rounded-full border-2 transition ${block.color === color.value ? "scale-110 border-foreground" : "border-transparent"}`} style={{ backgroundColor: color.value }} />)}</div> : null}
    <textarea rows={block.type === "heading" ? 2 : 3} value={block.text} onChange={(event) => onChange({ text: event.target.value })} placeholder={block.type === "heading" ? "Titre de section" : "Texte intégral"} className={`${fieldClass} resize-y leading-relaxed`} />
  </article>;
}

export default function SynthesisStudio({ initialSynthesis, initialDrafts, draftsUnavailable, creatorName, onModeChange }: {
  initialSynthesis: TrainingSynthesis;
  initialDrafts: SynthesisDraft[];
  draftsUnavailable: string | null;
  creatorName: string;
  onModeChange: (mode: PreparationMode) => void;
}) {
  const [synthesis, setSynthesis] = useState(() => normalizeTrainingSynthesis(initialSynthesis));
  const deferredSynthesis = useDeferredValue(synthesis);
  const [drafts, setDrafts] = useState(() => initialDrafts.map((draft) => ({ ...draft, payload: normalizeTrainingSynthesis(draft.payload) })));
  const [draftId, setDraftId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"save" | "import" | "export" | "png" | "duplicate" | "delete" | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [paste, setPaste] = useState("");
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [zoom, setZoom] = useState(0.72);
  const [fitWidth, setFitWidth] = useState(true);
  const fileInput = useRef<HTMLInputElement>(null);

  const change = (update: (current: TrainingSynthesis) => TrainingSynthesis) => {
    setSynthesis((current) => update(current));
    setDirty(true);
    setMessage(null);
  };

  const updateBlock = (index: number, patch: Partial<SynthesisBlock>) => change((current) => ({ ...current, blocks: current.blocks.map((block, position) => position === index ? { ...block, ...patch } : block) }));
  const moveBlock = (index: number, direction: -1 | 1) => change((current) => {
    const blocks = [...current.blocks];
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return current;
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    return { ...current, blocks };
  });

  const loadDraft = (id: string) => {
    const draft = drafts.find((item) => item.id === id);
    if (!draft) return;
    if (dirty && !window.confirm("Ouvrir ce brouillon remplacera les modifications non enregistrées. Continuer ?")) return;
    setSynthesis(normalizeTrainingSynthesis(draft.payload));
    setDraftId(draft.id);
    setDirty(false);
    setMessage({ type: "success", text: "Synthèse chargée." });
  };

  const startNew = () => {
    if (dirty && !window.confirm("Créer une nouvelle synthèse abandonnera les modifications non enregistrées. Continuer ?")) return;
    setSynthesis(createEmptySynthesis());
    setDraftId(null);
    setPaste("");
    setDirty(false);
    setMessage(null);
  };

  const importWord = async (file: File) => {
    setBusy("import");
    setMessage(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/admin/preparation/synthesis/import", { method: "POST", body: form });
      const result = await response.json().catch(() => null) as { synthesis?: TrainingSynthesis; importedBlocks?: number; error?: string } | null;
      if (!response.ok || !result?.synthesis) throw new Error(result?.error || "Import Word impossible.");
      const imported = normalizeTrainingSynthesis(result.synthesis);
      change((current) => ({ ...imported, coverImage: current.coverImage }));
      setDraftId(null);
      setMessage({ type: "success", text: `${result.importedBlocks ?? imported.blocks.length} éléments importés. Tout le texte reste modifiable.` });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Import Word impossible." });
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const structurePaste = () => {
    const blocks = blocksFromPastedText(paste);
    if (!blocks.length) return setMessage({ type: "error", text: "Collez d’abord le texte de la synthèse." });
    change((current) => ({ ...current, blocks }));
    setMessage({ type: "success", text: `${blocks.length} éléments structurés. Vous pouvez corriger chaque titre et paragraphe.` });
  };

  const save = async () => {
    setBusy("save");
    setMessage(null);
    try {
      const saved = await saveSynthesisDraft({ id: draftId, synthesis });
      setDrafts((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setDraftId(saved.id);
      setSynthesis(normalizeTrainingSynthesis(saved.payload));
      setDirty(false);
      setMessage({ type: "success", text: "Synthèse enregistrée." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Enregistrement impossible." });
    } finally { setBusy(null); }
  };

  const duplicate = async () => {
    if (!draftId) return;
    setBusy("duplicate");
    try {
      const copy = await duplicateSynthesisDraft(draftId);
      setDrafts((current) => [copy, ...current]);
      setDraftId(copy.id);
      setSynthesis(normalizeTrainingSynthesis(copy.payload));
      setDirty(false);
      setMessage({ type: "success", text: "Synthèse dupliquée." });
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Duplication impossible." }); }
    finally { setBusy(null); }
  };

  const remove = async () => {
    if (!draftId || !window.confirm("Supprimer définitivement cette synthèse ?")) return;
    setBusy("delete");
    try {
      await deleteSynthesisDraft(draftId);
      setDrafts((current) => current.filter((item) => item.id !== draftId));
      setSynthesis(createEmptySynthesis());
      setDraftId(null);
      setDirty(false);
      setMessage({ type: "success", text: "Synthèse supprimée." });
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Suppression impossible." }); }
    finally { setBusy(null); }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
  };

  const exportPdf = async () => {
    setBusy("export");
    setMessage(null);
    try {
      const response = await fetch("/api/admin/preparation/synthesis/pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ synthesis }) });
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(result?.error || "Export PDF impossible.");
      }
      downloadBlob(await response.blob(), `Ministry-School-Synthese-${synthesis.date}.pdf`);
      setMessage({ type: "success", text: "PDF généré avec succès." });
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Export PDF impossible." }); }
    finally { setBusy(null); }
  };

  const exportPng = async () => {
    setBusy("png");
    setMessage(null);
    try {
      const pages = Array.from(document.querySelectorAll<HTMLElement>("[data-synthesis-page]"));
      if (!pages.length) throw new Error("Aucune page à exporter.");
      await document.fonts.ready;
      const { toPng } = await import("html-to-image");
      for (let index = 0; index < pages.length; index++) {
        const data = await toPng(pages[index], { width: 720, height: 1018, pixelRatio: 2, cacheBust: true, backgroundColor: index === 0 ? "#101816" : "#fffdfa", style: { inset: "auto", position: "relative", transform: "none" } });
        const blob = await (await fetch(data)).blob();
        downloadBlob(blob, `Ministry-School-Synthese-${synthesis.date}-page-${index + 1}.png`);
      }
      setMessage({ type: "success", text: `${pages.length} page${pages.length > 1 ? "s" : ""} PNG générée${pages.length > 1 ? "s" : ""}.` });
    } catch (error) { setMessage({ type: "error", text: error instanceof Error ? error.message : "Export PNG impossible." }); }
    finally { setBusy(null); }
  };

  const fitPreview = () => {
    const available = window.innerWidth >= 1024 ? window.innerWidth * 0.6 - 88 : window.innerWidth - 32;
    setFitWidth(true);
    setZoom(Math.max(0.4, Math.min(1.15, Number((available / 720).toFixed(2)))));
  };

  return <div className="-mx-4 -mt-2 sm:-mx-7">
    <header className="border-b border-border bg-background px-4 pb-4 pt-1 sm:px-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="label text-[10px] text-link">Studio éditorial</p><h1 className="font-title mt-1 text-[30px] leading-tight sm:text-[36px]">Préparation</h1><p className="mt-1 text-sm text-muted">Transformez un Word ou un texte collé en synthèse institutionnelle.</p><PreparationModeTabs mode="synthesis" onChange={onModeChange} /></div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={startNew} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-semibold hover:border-foreground"><FileText size={16} /> Nouvelle</button>
          <button type="button" onClick={save} disabled={!!busy || !!draftsUnavailable} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-semibold hover:border-foreground disabled:opacity-50">{busy === "save" ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />} Enregistrer</button>
          <button type="button" onClick={exportPng} disabled={!!busy} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-semibold hover:border-foreground disabled:opacity-50">{busy === "png" ? <LoaderCircle className="animate-spin" size={16} /> : <ImageDown size={16} />} PNG</button>
          <button type="button" onClick={exportPdf} disabled={!!busy} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent disabled:opacity-50">{busy === "export" ? <LoaderCircle className="animate-spin" size={16} /> : <Download size={16} />} PDF</button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted"><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ${dirty ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-800"}`}>{dirty ? "Modifications non enregistrées" : <><Check size={13} /> À jour</>}</span>{creatorName ? <span>Connecté : {creatorName}</span> : null}</div>
      {draftsUnavailable ? <p role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{draftsUnavailable}</p> : null}
      {message ? <p role="status" className={`mt-3 rounded-lg border px-3 py-2 text-sm ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}>{message.text}</p> : null}
    </header>

    <div className="grid grid-cols-2 border-b border-border bg-background lg:hidden"><button type="button" onClick={() => setMobileTab("edit")} className={`min-h-11 text-sm font-semibold ${mobileTab === "edit" ? "border-b-2 border-foreground" : "text-muted"}`}>Édition</button><button type="button" onClick={() => setMobileTab("preview")} className={`min-h-11 text-sm font-semibold ${mobileTab === "preview" ? "border-b-2 border-foreground" : "text-muted"}`}>Aperçu</button></div>

    <div className="grid min-h-[calc(100vh-180px)] lg:grid-cols-[minmax(380px,40%)_minmax(0,60%)]">
      <aside className={`${mobileTab === "preview" ? "hidden" : "block"} border-r border-border bg-surface p-4 lg:block lg:max-h-[calc(100vh-64px)] lg:overflow-y-auto sm:p-5`}>
        <div className="space-y-5">
          <details className="group rounded-xl border border-border bg-background" open={drafts.length > 0}><summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">Synthèses enregistrées <ChevronDown size={16} className="transition group-open:rotate-180" /></summary><div className="border-t border-border p-3">{drafts.length ? <><select value={draftId ?? ""} onChange={(event) => event.target.value && loadDraft(event.target.value)} className="min-h-11 w-full rounded-lg border border-border px-3 text-sm"><option value="">Choisir un brouillon…</option>{drafts.map((draft) => <option key={draft.id} value={draft.id}>{draft.title} · {formatSynthesisDate(draft.synthesis_date)}</option>)}</select><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" disabled={!draftId || !!busy} onClick={duplicate} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border text-xs font-semibold disabled:opacity-40"><Copy size={14} /> Dupliquer</button><button type="button" disabled={!draftId || !!busy} onClick={remove} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-200 text-xs font-semibold text-red-800 disabled:opacity-40"><Trash2 size={14} /> Supprimer</button></div></> : <p className="text-sm text-muted">Aucune synthèse enregistrée.</p>}</div></details>

          <section className="rounded-xl border border-border bg-background p-4"><div className="mb-4 flex items-center gap-2"><Upload size={17} className="text-link" /><h2 className="font-title text-xl">Importer le contenu</h2></div><input ref={fileInput} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importWord(file); }} /><button type="button" disabled={busy === "import"} onClick={() => fileInput.current?.click()} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent disabled:opacity-50">{busy === "import" ? <LoaderCircle className="animate-spin" size={16} /> : <Upload size={16} />} Importer un Word</button><div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-[0.16em] text-muted"><span className="h-px flex-1 bg-border" />ou coller<span className="h-px flex-1 bg-border" /></div><textarea rows={6} value={paste} onChange={(event) => setPaste(event.target.value)} placeholder="Collez ici la synthèse complète…" className={`${fieldClass} resize-y leading-relaxed`} /><button type="button" onClick={structurePaste} className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-border text-xs font-semibold hover:border-foreground"><Sparkles size={14} /> Structurer le texte</button></section>

          <section className="rounded-xl border border-border bg-background p-4"><div className="mb-4 flex items-center gap-2"><Sparkles size={17} className="text-link" /><h2 className="font-title text-xl">Couverture</h2></div><div className="space-y-3"><label className="block text-xs font-medium text-muted">Titre<input value={synthesis.title} onChange={(event) => change((current) => ({ ...current, title: event.target.value }))} className={fieldClass} /></label><label className="block text-xs font-medium text-muted">Sous-titre<input value={synthesis.subtitle} onChange={(event) => change((current) => ({ ...current, subtitle: event.target.value }))} className={fieldClass} /></label><label className="block text-xs font-medium text-muted">Date<input type="date" value={synthesis.date} onChange={(event) => change((current) => ({ ...current, date: event.target.value }))} className={fieldClass} /></label><label className="block text-xs font-medium text-muted">Intervenant(s)<input value={synthesis.speakers} onChange={(event) => change((current) => ({ ...current, speakers: event.target.value }))} placeholder="Nathalie Boudehent" className={fieldClass} /></label><label className="block text-xs font-medium text-muted">Introduction<textarea rows={3} value={synthesis.introduction} onChange={(event) => change((current) => ({ ...current, introduction: event.target.value }))} className={`${fieldClass} resize-y`} /></label></div></section>

          <section className="rounded-xl border border-border bg-background p-4"><div className="mb-4 flex items-center justify-between gap-3"><div><p className="label text-[9px] text-link">Corps du document</p><h2 className="font-title mt-1 text-xl">Texte intégral</h2></div><span className="text-xs text-muted">{synthesis.blocks.length} éléments</span></div><div className="space-y-3">{synthesis.blocks.length ? synthesis.blocks.map((block, index) => <BlockEditor key={block.id} block={block} index={index} count={synthesis.blocks.length} onChange={(patch) => updateBlock(index, patch)} onMove={(direction) => moveBlock(index, direction)} onDelete={() => change((current) => ({ ...current, blocks: current.blocks.filter((_, position) => position !== index) }))} />) : <div className="rounded-xl border border-dashed border-border px-4 py-7 text-center text-sm text-muted">Importez votre Word ou collez le texte complet.</div>}</div><button type="button" onClick={() => change((current) => ({ ...current, blocks: [...current.blocks, newBlock()] }))} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border text-sm font-semibold hover:border-foreground"><Plus size={16} /> Ajouter un élément</button></section>
        </div>
      </aside>

      <section className={`${mobileTab === "edit" ? "hidden" : "flex"} min-w-0 flex-col bg-[#e9e5dd] lg:flex lg:max-h-[calc(100vh-64px)]`}><div className="sticky top-0 z-10 flex min-h-14 items-center justify-between border-b border-black/10 bg-[#f6f3ec]/95 px-4 backdrop-blur sm:px-5"><div><p className="text-sm font-semibold">Aperçu PDF</p><p className="text-xs text-muted">Couverture sombre · pages de lecture blanches</p></div><div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1"><button type="button" onClick={() => { setFitWidth(false); setZoom((value) => Math.max(0.4, Number((value - 0.1).toFixed(2)))); }} aria-label="Zoom arrière" className="rounded-md p-2 hover:bg-surface"><Minus size={15} /></button><button type="button" onClick={fitPreview} aria-label="Ajuster à la largeur" className="min-w-12 rounded-md px-2 py-1.5 text-xs font-semibold hover:bg-surface">{fitWidth ? "Largeur" : `${Math.round(zoom * 100)}%`}</button><button type="button" onClick={() => { setFitWidth(false); setZoom((value) => Math.min(1.15, Number((value + 0.1).toFixed(2)))); }} aria-label="Zoom avant" className="rounded-md p-2 hover:bg-surface"><Plus size={15} /></button></div></div><div className="min-h-0 flex-1"><SynthesisPreview synthesis={deferredSynthesis} zoom={zoom} fitWidth={fitWidth} /></div></section>
    </div>
  </div>;
}
