"use client";

import { ArrowDown, ArrowUp, Check, Clock3, Copy, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import AdminSelect from "@/components/admin/AdminSelect";
import { saveOpportunityAgenda } from "@/app/etudiant/services/actions";
import { AGENDA_TYPE_LABELS, AGENDA_TYPES, type AgendaType, type OpportunityAgendaStep } from "@/lib/data/opportunity-agenda";
import { formatSessionDate } from "@/lib/format";

type SessionDate = { id?: string; session_date: string; start_time: string; end_time: string };
type EditableStep = Omit<OpportunityAgendaStep, "id" | "opportunity_date_id" | "position"> & { key: string };

const field = "min-h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10";

const minutesBetween = (start: string, end: string) => {
  const [startHour, startMinute] = start.slice(0, 5).split(":").map(Number);
  const [endHour, endMinute] = end.slice(0, 5).split(":").map(Number);
  return Math.max(0, endHour * 60 + endMinute - startHour * 60 - startMinute);
};

const asEditable = (step: OpportunityAgendaStep): EditableStep => ({
  key: step.id,
  duration_minutes: step.duration_minutes,
  activity_type: step.activity_type,
  custom_type: step.custom_type,
  explanation: step.explanation,
});

const emptyStep = (): EditableStep => ({ key: crypto.randomUUID(), duration_minutes: 15, activity_type: "theory", custom_type: null, explanation: "" });

export default function OpportunityAgendaEditor({ opportunityId, dates, initialSteps, canEdit, experience = "workspace" }: {
  opportunityId: string;
  dates: SessionDate[];
  initialSteps: OpportunityAgendaStep[];
  canEdit: boolean;
  experience?: "supervision" | "workspace";
}) {
  const initialByDate = useMemo(() => new Map(dates.map((date) => [date.id ?? "", initialSteps.filter((step) => step.opportunity_date_id === date.id).map(asEditable)])), [dates, initialSteps]);
  const [plans, setPlans] = useState(initialByDate);
  const [editing, setEditing] = useState(experience === "workspace");
  const effectiveCanEdit = canEdit && editing;

  const replace = (dateId: string, steps: EditableStep[]) => setPlans((current) => new Map(current).set(dateId, steps));

  return <section className="rounded-3xl border border-border bg-background p-5 sm:p-7">
    <div className="flex flex-wrap items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-muted"><Clock3 size={19} /></span><div className="min-w-0 flex-1"><p className="label text-xs tracking-[.14em] text-muted">ORGANISATION PÉDAGOGIQUE</p><h2 className="font-title mt-1 text-[24px] text-foreground">Déroulé de la formation</h2><p className="mt-1 text-sm leading-relaxed text-muted">Un déroulé distinct par séance, comparé automatiquement à la durée disponible.</p></div>{canEdit && experience === "supervision" && <button type="button" onClick={() => setEditing((current) => !current)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:border-foreground">{editing ? <X size={16} /> : <Pencil size={16} />}{editing ? "Terminer" : "Modifier"}</button>}</div>
    <div className="mt-5 space-y-4">
      {dates.filter((date): date is SessionDate & { id: string } => !!date.id).map((date) => <SessionAgenda key={date.id} opportunityId={opportunityId} date={date} steps={plans.get(date.id) ?? []} allDates={dates.filter((item): item is SessionDate & { id: string } => !!item.id)} plans={plans} canEdit={effectiveCanEdit} onChange={(steps) => replace(date.id, steps)} />)}
      {dates.length === 0 && <div className="rounded-2xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted">Ajoutez d’abord une séance pour préparer son déroulé.</div>}
    </div>
  </section>;
}

function SessionAgenda({ opportunityId, date, steps, allDates, plans, canEdit, onChange }: {
  opportunityId: string;
  date: SessionDate & { id: string };
  steps: EditableStep[];
  allDates: (SessionDate & { id: string })[];
  plans: Map<string, EditableStep[]>;
  canEdit: boolean;
  onChange: (steps: EditableStep[]) => void;
}) {
  const [copyFrom, setCopyFrom] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const available = minutesBetween(date.start_time, date.end_time);
  const planned = steps.reduce((sum, step) => sum + Number(step.duration_minutes || 0), 0);
  const remaining = available - planned;
  const update = (index: number, patch: Partial<EditableStep>) => onChange(steps.map((step, stepIndex) => stepIndex === index ? { ...step, ...patch } : step));
  const move = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= steps.length) return;
    const next = [...steps];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
  };
  const save = () => startTransition(async () => {
    setMessage(null);
    const formData = new FormData();
    formData.set("opportunity_id", opportunityId);
    formData.set("opportunity_date_id", date.id);
    formData.set("steps", JSON.stringify(steps.map(({ duration_minutes, activity_type, custom_type, explanation }) => ({ duration_minutes, activity_type, custom_type, explanation }))));
    try { await saveOpportunityAgenda(formData); setMessage("Déroulé enregistré"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "L’enregistrement a échoué."); }
  });

  return <article className="overflow-hidden rounded-2xl border border-border">
    <header className="flex flex-wrap items-center justify-between gap-3 bg-surface/60 px-4 py-4 sm:px-5">
      <div><h3 className="font-semibold capitalize text-foreground">{formatSessionDate(date.session_date)}</h3><p className="mt-0.5 text-xs text-muted">{date.start_time.slice(0,5).replace(":"," h ")}–{date.end_time.slice(0,5).replace(":"," h ")}</p></div>
      <div className="text-right"><p className={`text-sm font-semibold ${remaining < 0 ? "text-red-700" : "text-foreground"}`}>Durée prévue : {planned} min / {available} min</p><p className={`text-xs ${remaining < 0 ? "text-red-700" : "text-muted"}`}>{remaining < 0 ? `Dépassement de ${Math.abs(remaining)} min` : `${remaining} min restante${remaining > 1 ? "s" : ""}`}</p></div>
    </header>
    <div className="p-4 sm:p-5">
      {steps.length ? <ol className="space-y-2">{steps.map((step, index) => <li key={step.key} className="grid gap-2 rounded-xl border border-border-soft bg-background p-3 lg:grid-cols-[86px_190px_minmax(0,1fr)_auto] lg:items-start">
        {canEdit ? <input type="number" min={1} max={1440} aria-label="Durée en minutes" value={step.duration_minutes} onChange={(event) => update(index, { duration_minutes: Number(event.target.value) })} className={field} /> : <span className="text-sm font-semibold">{step.duration_minutes} min</span>}
        <div>{canEdit ? <AdminSelect value={step.activity_type} onValueChange={(value) => update(index, { activity_type: value as AgendaType, custom_type: value === "other" ? step.custom_type : null })} ariaLabel="Type d’activité" options={AGENDA_TYPES.map((value) => ({ value, label: AGENDA_TYPE_LABELS[value] }))} /> : <span className="text-sm font-semibold">{step.activity_type === "other" ? step.custom_type : AGENDA_TYPE_LABELS[step.activity_type]}</span>}{canEdit && step.activity_type === "other" && <input value={step.custom_type ?? ""} onChange={(event) => update(index, { custom_type: event.target.value })} placeholder="Préciser le type" className={`${field} mt-2`} />}</div>
        {canEdit ? <input value={step.explanation} maxLength={1000} onChange={(event) => update(index, { explanation: event.target.value })} placeholder="Explication courte de cette étape" className={field} /> : <p className="text-sm leading-6 text-muted">{step.explanation || "Aucune explication"}</p>}
        {canEdit && <div className="flex items-center gap-1"><button type="button" onClick={() => move(index,-1)} disabled={index===0} aria-label="Monter l’étape" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-foreground disabled:opacity-30"><ArrowUp size={15} /></button><button type="button" onClick={() => move(index,1)} disabled={index===steps.length-1} aria-label="Descendre l’étape" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-foreground disabled:opacity-30"><ArrowDown size={15} /></button><button type="button" onClick={() => onChange(steps.filter((_,stepIndex)=>stepIndex!==index))} aria-label="Supprimer l’étape" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-700"><Trash2 size={15} /></button></div>}
      </li>)}</ol> : <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">Aucune étape renseignée pour cette séance.</p>}

      {canEdit && <div className="mt-4 flex flex-col gap-3 border-t border-border-soft pt-4 sm:flex-row sm:flex-wrap sm:items-center">
        <button type="button" onClick={() => onChange([...steps, emptyStep()])} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:border-foreground"><Plus size={16} /> Ajouter une étape</button>
        {allDates.length > 1 && <div className="flex min-w-0 flex-1 gap-2 sm:max-w-md"><AdminSelect value={copyFrom} onValueChange={setCopyFrom} placeholder="Réutiliser un déroulé…" ariaLabel="Séance à réutiliser" className="min-w-0 flex-1" options={allDates.filter((item)=>item.id!==date.id).map((item)=>({value:item.id,label:formatSessionDate(item.session_date)}))} /><button type="button" disabled={!copyFrom} onClick={() => onChange((plans.get(copyFrom) ?? []).map((step)=>({...step,key:crypto.randomUUID()})))} aria-label="Réutiliser ce déroulé" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border disabled:opacity-40"><Copy size={16} /></button></div>}
        <button type="button" onClick={save} disabled={pending || steps.some((step)=>step.duration_minutes<1 || (step.activity_type==="other" && !step.custom_type?.trim()))} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-on-accent disabled:opacity-50 sm:ml-auto">{pending ? <Loader2 size={16} className="animate-spin" /> : message === "Déroulé enregistré" ? <Check size={16} /> : <Save size={16} />}{pending ? "Enregistrement…" : "Enregistrer le déroulé"}</button>
        {message && <p role="status" className={`w-full text-xs ${message === "Déroulé enregistré" ? "text-emerald-700" : "text-red-700"}`}>{message}</p>}
      </div>}
    </div>
  </article>;
}
