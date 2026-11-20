"use client";

import { useDeferredValue, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  FilePlus2,
  ImageDown,
  LoaderCircle,
  Minus,
  Plus,
  RefreshCcw,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  deleteProgramDraft,
  duplicateProgramDraft,
  importTrainingDay,
  saveProgramDraft,
} from "@/app/gestion/preparation/actions";
import {
  activeDayKinds,
  createEmptyProgram,
  dateForDay,
  formatProgramDate,
  normalizeTrainingProgram,
  sortSlots,
  type ProgramDay,
  type ProgramDayKind,
  type ProgramDayMode,
  type ProgramDraft,
  type ProgramSlot,
  type TrainingProgram,
} from "@/lib/preparation/program";
import ProgramPreview from "./ProgramPreview";
import SlotEditor from "./SlotEditor";

type SectionKey = "morning" | "afternoon";

const fieldClass = "mt-1 min-h-11 w-full rounded-lg border border-border px-3 py-2.5 text-sm";

function emptySlot(type: ProgramSlot["type"] = "formation"): ProgramSlot {
  return { id: crypto.randomUUID(), start: "", end: "", type, title: type === "pause" ? "Pause" : "", subtitle: "", speaker: "", description: "", location: "" };
}

function dayLabel(kind: ProgramDayKind) {
  return kind === "samedi" ? "Samedi" : "Dimanche";
}

function replaceDay(program: TrainingProgram, kind: ProgramDayKind, update: (day: ProgramDay) => ProgramDay): TrainingProgram {
  return { ...program, days: program.days.map((day) => day.kind === kind ? update(day) : day) };
}

function EditorSection({
  title,
  section,
  day,
  onAdd,
  onSort,
  onSlotChange,
  onDelete,
  onDuplicate,
  onMove,
  onDragStart,
  onDrop,
}: {
  title: string;
  section: SectionKey;
  day: ProgramDay;
  onAdd: () => void;
  onSort: () => void;
  onSlotChange: (index: number, patch: Partial<ProgramSlot>) => void;
  onDelete: (index: number) => void;
  onDuplicate: (index: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onDragStart: (index: number) => void;
  onDrop: (index: number) => void;
}) {
  const slots = day[section];
  return <section className="space-y-3">
    <div className="flex items-center justify-between gap-3">
      <h4 className="font-title text-xl">{title}</h4>
      <button type="button" onClick={onSort} className="text-xs font-semibold text-muted underline-offset-4 hover:text-foreground hover:underline">Trier par horaire</button>
    </div>
    {slots.length ? slots.map((slot, index) => <SlotEditor key={slot.id} slot={slot} index={index} count={slots.length} onChange={(patch) => onSlotChange(index, patch)} onDelete={() => onDelete(index)} onDuplicate={() => onDuplicate(index)} onMove={(direction) => onMove(index, direction)} onDragStart={() => onDragStart(index)} onDrop={() => onDrop(index)} />) : <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-6 text-center text-sm text-muted">Aucun créneau. Ajoutez-en un ou importez les formations enregistrées.</div>}
    <button type="button" onClick={onAdd} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-semibold hover:border-foreground"><Plus size={16} /> Ajouter un créneau</button>
  </section>;
}

export default function PreparationStudio({
  initialProgram,
  initialDrafts,
  draftsUnavailable,
  creatorName,
}: {
  initialProgram: TrainingProgram;
  initialDrafts: ProgramDraft[];
  draftsUnavailable: string | null;
  creatorName: string;
}) {
  const [program, setProgram] = useState(() => normalizeTrainingProgram(initialProgram));
  const deferredProgram = useDeferredValue(program);
  const [drafts, setDrafts] = useState(() => initialDrafts.map((draft) => ({ ...draft, payload: normalizeTrainingProgram(draft.payload) })));
  const [draftId, setDraftId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"save" | "import" | "export" | "png" | "duplicate" | "delete" | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [zoom, setZoom] = useState(0.78);
  const [fitWidth, setFitWidth] = useState(true);
  const drag = useRef<{ kind: ProgramDayKind; section: SectionKey; index: number } | null>(null);

  const changeProgram = (update: (current: TrainingProgram) => TrainingProgram) => {
    setProgram((current) => update(current));
    setDirty(true);
    setMessage(null);
  };

  const updateDay = (kind: ProgramDayKind, update: (day: ProgramDay) => ProgramDay) => changeProgram((current) => replaceDay(current, kind, update));

  const changeBaseDate = (baseDate: string) => changeProgram((current) => ({
    ...current,
    baseDate,
    days: current.days.map((day) => ({ ...day, date: dateForDay(baseDate, day.kind) })),
  }));

  const changeDayMode = (dayMode: ProgramDayMode) => changeProgram((current) => {
    const existing = new Map(current.days.map((day) => [day.kind, day]));
    return {
      ...current,
      dayMode,
      days: activeDayKinds(dayMode).map((kind) => existing.get(kind) ?? { kind, date: dateForDay(current.baseDate, kind), includeAfternoon: false, morning: [], afternoon: [] }),
    };
  });

  const mutateSlots = (kind: ProgramDayKind, section: SectionKey, update: (slots: ProgramSlot[]) => ProgramSlot[]) =>
    updateDay(kind, (day) => ({ ...day, [section]: update(day[section]) }));

  const importDay = async (day: ProgramDay) => {
    const hasWork = day.morning.length + day.afternoon.length > 0;
    if (hasWork && !window.confirm(`Actualiser ${dayLabel(day.kind).toLowerCase()} remplacera les créneaux de cette journée. Continuer ?`)) return;
    setBusy("import");
    setMessage(null);
    try {
      const result = await importTrainingDay(day.date);
      if (!result.found) {
        setMessage({ type: "error", text: `Aucune formation enregistrée le ${formatProgramDate(day.date)}.` });
        return;
      }
      const morning = result.slots.filter((slot) => !slot.start || slot.start < "14:00");
      const afternoon = result.slots.filter((slot) => slot.start >= "14:00");
      updateDay(day.kind, (current) => ({ ...current, morning, afternoon, includeAfternoon: current.includeAfternoon || afternoon.length > 0 }));
      setMessage({ type: "success", text: `${result.found} créneau${result.found > 1 ? "x" : ""} importé${result.found > 1 ? "s" : ""}. Tous les champs restent modifiables.` });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Import impossible." });
    } finally {
      setBusy(null);
    }
  };

  const loadDraft = (id: string) => {
    const draft = drafts.find((item) => item.id === id);
    if (!draft) return;
    if (dirty && !window.confirm("Ouvrir ce brouillon remplacera les modifications non enregistrées. Continuer ?")) return;
    setProgram(normalizeTrainingProgram(draft.payload));
    setDraftId(draft.id);
    setDirty(false);
    setMessage({ type: "success", text: "Brouillon chargé." });
  };

  const newProgram = () => {
    if (dirty && !window.confirm("Créer un nouveau programme abandonnera les modifications non enregistrées. Continuer ?")) return;
    setProgram(createEmptyProgram());
    setDraftId(null);
    setDirty(false);
    setMessage(null);
  };

  const save = async () => {
    setBusy("save");
    setMessage(null);
    try {
      const saved = await saveProgramDraft({ id: draftId, program });
      setDrafts((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setDraftId(saved.id);
      setProgram(normalizeTrainingProgram(saved.payload));
      setDirty(false);
      setMessage({ type: "success", text: "Brouillon enregistré." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Enregistrement impossible." });
    } finally {
      setBusy(null);
    }
  };

  const duplicate = async () => {
    if (!draftId) return;
    setBusy("duplicate");
    try {
      const copy = await duplicateProgramDraft(draftId);
      setDrafts((current) => [copy, ...current]);
      setDraftId(copy.id);
      setProgram(normalizeTrainingProgram(copy.payload));
      setDirty(false);
      setMessage({ type: "success", text: "Programme dupliqué. Vous pouvez maintenant changer sa date." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Duplication impossible." });
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!draftId || !window.confirm("Supprimer définitivement ce brouillon ?")) return;
    setBusy("delete");
    try {
      await deleteProgramDraft(draftId);
      setDrafts((current) => current.filter((item) => item.id !== draftId));
      setProgram(createEmptyProgram());
      setDraftId(null);
      setDirty(false);
      setMessage({ type: "success", text: "Brouillon supprimé." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Suppression impossible." });
    } finally {
      setBusy(null);
    }
  };

  const exportPdf = async () => {
    setBusy("export");
    setMessage(null);
    try {
      const response = await fetch("/api/admin/preparation/pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ program }) });
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(result?.error || "Export PDF impossible.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Ministry-School-Programme-${program.baseDate}.pdf`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage({ type: "success", text: "PDF généré avec succès." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Export PDF impossible." });
    } finally {
      setBusy(null);
    }
  };

  const exportPng = async () => {
    setBusy("png");
    setMessage(null);
    try {
      const pages = Array.from(document.querySelectorAll<HTMLElement>("[data-program-page]"));
      if (!pages.length) throw new Error("Aucune page à exporter.");

      await document.fonts.ready;
      const { toPng } = await import("html-to-image");
      const images = await Promise.all(pages.map(async (page) => {
        const source = await toPng(page, {
          width: 720,
          height: 1018,
          pixelRatio: 2,
          cacheBust: true,
          backgroundColor: "#17211f",
          style: {
            inset: "auto",
            position: "relative",
            transform: "none",
          },
        });
        return await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error("Une page du programme n’a pas pu être convertie."));
          image.src = source;
        });
      }));

      const canvas = document.createElement("canvas");
      canvas.width = images[0].naturalWidth;
      canvas.height = images.reduce((height, image) => height + image.naturalHeight, 0);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("La génération PNG n’est pas prise en charge par ce navigateur.");
      let offsetY = 0;
      for (const image of images) {
        context.drawImage(image, 0, offsetY);
        offsetY += image.naturalHeight;
      }

      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Le fichier PNG n’a pas pu être créé.")), "image/png"));
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Ministry-School-Programme-${program.baseDate}.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage({ type: "success", text: "PNG haute définition généré avec succès." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Export PNG impossible." });
    } finally {
      setBusy(null);
    }
  };

  const fitPreview = () => {
    const available = window.innerWidth >= 1024 ? window.innerWidth * 0.6 - 88 : window.innerWidth - 32;
    setFitWidth(true);
    setZoom(Math.max(0.4, Math.min(1.15, Number((available / 720).toFixed(2)))));
  };

  return <div className="-mx-4 -mt-2 sm:-mx-7">
    <header className="border-b border-border bg-background px-4 pb-4 pt-1 sm:px-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="label text-[10px] text-link">Studio éditorial</p><h1 className="font-title mt-1 text-[30px] leading-tight sm:text-[36px]">Préparation</h1><p className="mt-1 text-sm text-muted">Créez, ajustez et exportez un programme institutionnel en quelques minutes.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={newProgram} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-semibold hover:border-foreground"><FilePlus2 size={16} /> Nouveau</button>
          <button type="button" onClick={save} disabled={!!busy || !!draftsUnavailable} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-semibold hover:border-foreground disabled:opacity-50">{busy === "save" ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />} Enregistrer</button>
          <button type="button" onClick={exportPng} disabled={!!busy} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-semibold hover:border-foreground disabled:opacity-50">{busy === "png" ? <LoaderCircle className="animate-spin" size={16} /> : <ImageDown size={16} />} Exporter en PNG</button>
          <button type="button" onClick={exportPdf} disabled={!!busy} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent disabled:opacity-50">{busy === "export" ? <LoaderCircle className="animate-spin" size={16} /> : <Download size={16} />} Exporter en PDF</button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ${dirty ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-800"}`}>{dirty ? "Modifications non enregistrées" : <><Check size={13} /> À jour</>}</span>
        {creatorName ? <span>Connecté : {creatorName}</span> : null}
      </div>
      {draftsUnavailable ? <p role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{draftsUnavailable}</p> : null}
      {message ? <p role="status" className={`mt-3 rounded-lg border px-3 py-2 text-sm ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}>{message.text}</p> : null}
    </header>

    <div className="grid grid-cols-2 border-b border-border bg-background lg:hidden">
      <button type="button" onClick={() => setMobileTab("edit")} className={`min-h-11 text-sm font-semibold ${mobileTab === "edit" ? "border-b-2 border-foreground text-foreground" : "text-muted"}`}>Édition</button>
      <button type="button" onClick={() => setMobileTab("preview")} className={`min-h-11 text-sm font-semibold ${mobileTab === "preview" ? "border-b-2 border-foreground text-foreground" : "text-muted"}`}>Aperçu</button>
    </div>

    <div className="grid min-h-[calc(100vh-180px)] lg:grid-cols-[minmax(380px,40%)_minmax(0,60%)]">
      <aside className={`${mobileTab === "preview" ? "hidden" : "block"} border-r border-border bg-surface p-4 lg:block lg:max-h-[calc(100vh-64px)] lg:overflow-y-auto sm:p-5`}>
        <div className="space-y-5">
          <details className="group rounded-xl border border-border bg-background" open={drafts.length > 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">Programmes enregistrés <ChevronDown size={16} className="transition group-open:rotate-180" /></summary>
            <div className="border-t border-border p-3">
              {drafts.length ? <><select value={draftId ?? ""} onChange={(event) => event.target.value && loadDraft(event.target.value)} className="min-h-11 w-full rounded-lg border border-border px-3 text-sm"><option value="">Choisir un brouillon…</option>{drafts.map((draft) => <option key={draft.id} value={draft.id}>{draft.title} · {formatProgramDate(draft.program_date, { day: "2-digit", month: "2-digit", year: "numeric" })}</option>)}</select><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" disabled={!draftId || !!busy} onClick={duplicate} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border text-xs font-semibold disabled:opacity-40"><Copy size={14} /> Dupliquer</button><button type="button" disabled={!draftId || !!busy} onClick={remove} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-200 text-xs font-semibold text-red-800 disabled:opacity-40"><Trash2 size={14} /> Supprimer</button></div></> : <p className="text-sm text-muted">Aucun brouillon enregistré.</p>}
            </div>
          </details>

          <section className="rounded-xl border border-border bg-background p-4">
            <div className="mb-4 flex items-center gap-2"><Sparkles size={17} className="text-link" /><h2 className="font-title text-xl">Informations générales</h2></div>
            <div className="space-y-3">
              <label className="block text-xs font-medium text-muted">Titre<input value={program.title} onChange={(event) => changeProgram((current) => ({ ...current, title: event.target.value }))} className={fieldClass} /></label>
              <label className="block text-xs font-medium text-muted">Date de référence<input type="date" value={program.baseDate} onChange={(event) => changeBaseDate(event.target.value)} className={fieldClass} /></label>
              <fieldset><legend className="text-xs font-medium text-muted">Journée</legend><div className="mt-1 grid grid-cols-3 rounded-lg border border-border bg-surface p-1">{([['samedi', 'Samedi'], ['dimanche', 'Dimanche'], ['weekend', 'Les deux']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => changeDayMode(value)} className={`min-h-9 rounded-md px-2 text-xs font-semibold ${program.dayMode === value ? "bg-background text-foreground shadow-sm" : "text-muted"}`}>{label}</button>)}</div></fieldset>
              <label className="block text-xs font-medium text-muted">Introduction<textarea rows={3} maxLength={420} value={program.introduction} onChange={(event) => changeProgram((current) => ({ ...current, introduction: event.target.value }))} placeholder="Quelques lignes pour introduire la journée…" className={`${fieldClass} resize-none`} /></label>
            </div>
          </section>

          {program.days.map((day) => <section key={day.kind} className="rounded-xl border border-border bg-background p-4">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
              <div><p className="label text-[9px] text-link">{dayLabel(day.kind)}</p><h3 className="font-title mt-1 text-2xl capitalize">{formatProgramDate(day.date)}</h3></div>
              <button type="button" onClick={() => importDay(day)} disabled={busy === "import"} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold hover:border-foreground disabled:opacity-50">{busy === "import" ? <LoaderCircle className="animate-spin" size={14} /> : <RefreshCcw size={14} />} Importer les formations</button>
            </div>
            <div className="mt-5 space-y-6">
              <EditorSection title="Programme du matin" section="morning" day={day} onAdd={() => mutateSlots(day.kind, "morning", (slots) => sortSlots([...slots, emptySlot()]))} onSort={() => mutateSlots(day.kind, "morning", sortSlots)} onSlotChange={(index, patch) => mutateSlots(day.kind, "morning", (slots) => slots.map((slot, position) => position === index ? { ...slot, ...patch } : slot))} onDelete={(index) => mutateSlots(day.kind, "morning", (slots) => slots.filter((_, position) => position !== index))} onDuplicate={(index) => mutateSlots(day.kind, "morning", (slots) => slots.flatMap((slot, position) => position === index ? [slot, { ...slot, id: crypto.randomUUID(), sourceId: undefined }] : [slot]))} onMove={(index, direction) => mutateSlots(day.kind, "morning", (slots) => { const next = [...slots]; const target = index + direction; if (target < 0 || target >= next.length) return next; [next[index], next[target]] = [next[target], next[index]]; return next; })} onDragStart={(index) => { drag.current = { kind: day.kind, section: "morning", index }; }} onDrop={(index) => { const origin = drag.current; if (!origin || origin.kind !== day.kind || origin.section !== "morning") return; mutateSlots(day.kind, "morning", (slots) => { const next = [...slots]; const [moved] = next.splice(origin.index, 1); next.splice(index, 0, moved); return next; }); drag.current = null; }} />
              <div className="flex items-center justify-between gap-4 rounded-xl bg-surface px-3 py-3"><div><p className="text-sm font-semibold">Inclure le programme de l’après-midi</p><p className="mt-0.5 text-xs text-muted">Section indépendante du matin</p></div><button type="button" role="switch" aria-checked={day.includeAfternoon} onClick={() => updateDay(day.kind, (current) => ({ ...current, includeAfternoon: !current.includeAfternoon }))} className={`relative h-7 w-12 shrink-0 rounded-full transition ${day.includeAfternoon ? "bg-accent" : "bg-[#c7c9c4]"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${day.includeAfternoon ? "left-6" : "left-1"}`} /></button></div>
              {day.includeAfternoon ? <EditorSection title="Programme de l’après-midi" section="afternoon" day={day} onAdd={() => mutateSlots(day.kind, "afternoon", (slots) => sortSlots([...slots, emptySlot()]))} onSort={() => mutateSlots(day.kind, "afternoon", sortSlots)} onSlotChange={(index, patch) => mutateSlots(day.kind, "afternoon", (slots) => slots.map((slot, position) => position === index ? { ...slot, ...patch } : slot))} onDelete={(index) => mutateSlots(day.kind, "afternoon", (slots) => slots.filter((_, position) => position !== index))} onDuplicate={(index) => mutateSlots(day.kind, "afternoon", (slots) => slots.flatMap((slot, position) => position === index ? [slot, { ...slot, id: crypto.randomUUID(), sourceId: undefined }] : [slot]))} onMove={(index, direction) => mutateSlots(day.kind, "afternoon", (slots) => { const next = [...slots]; const target = index + direction; if (target < 0 || target >= next.length) return next; [next[index], next[target]] = [next[target], next[index]]; return next; })} onDragStart={(index) => { drag.current = { kind: day.kind, section: "afternoon", index }; }} onDrop={(index) => { const origin = drag.current; if (!origin || origin.kind !== day.kind || origin.section !== "afternoon") return; mutateSlots(day.kind, "afternoon", (slots) => { const next = [...slots]; const [moved] = next.splice(origin.index, 1); next.splice(index, 0, moved); return next; }); drag.current = null; }} /> : null}
            </div>
          </section>)}
        </div>
      </aside>

      <section className={`${mobileTab === "edit" ? "hidden" : "flex"} min-w-0 flex-col bg-[#e9e5dd] lg:flex lg:max-h-[calc(100vh-64px)]`}>
        <div className="sticky top-0 z-10 flex min-h-14 items-center justify-between border-b border-black/10 bg-[#f6f3ec]/95 px-4 backdrop-blur sm:px-5">
          <div><p className="text-sm font-semibold">Aperçu PDF</p><p className="text-xs text-muted">A4 portrait · texte sélectionnable</p></div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
            <button type="button" onClick={() => { setFitWidth(false); setZoom((value) => Math.max(0.4, Number((value - 0.1).toFixed(2)))); }} aria-label="Zoom arrière" className="rounded-md p-2 hover:bg-surface"><Minus size={15} /></button>
            <button type="button" onClick={fitPreview} aria-label="Ajuster à la largeur" title="Ajuster à la largeur" className="min-w-12 rounded-md px-2 py-1.5 text-xs font-semibold hover:bg-surface">{fitWidth ? "Largeur" : `${Math.round(zoom * 100)}%`}</button>
            <button type="button" onClick={() => { setFitWidth(false); setZoom((value) => Math.min(1.15, Number((value + 0.1).toFixed(2)))); }} aria-label="Zoom avant" className="rounded-md p-2 hover:bg-surface"><Plus size={15} /></button>
          </div>
        </div>
        <div className="min-h-0 flex-1"><ProgramPreview program={deferredProgram} zoom={zoom} fitWidth={fitWidth} /></div>
      </section>
    </div>
  </div>;
}
