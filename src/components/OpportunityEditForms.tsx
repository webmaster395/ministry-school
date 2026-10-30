"use client";

import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import type { Opportunity, Responsibility } from "@/lib/data/opportunities";
import { opportunityType } from "@/lib/data/opportunities";
import { replaceOpportunityDates, saveOpportunityContent, saveOpportunityManagement } from "@/app/etudiant/services/actions";
import DynamicListInput from "@/components/DynamicListInput";
import OpportunityEmojiPicker from "@/components/OpportunityEmojiPicker";
import RichTextEditor from "@/components/gestion/RichTextEditor";
import { opportunityEmoji } from "@/lib/opportunity-banner";
import StrategicAxesFields from "@/components/StrategicAxesFields";
import WorkshopMaterialsInput from "@/components/WorkshopMaterialsInput";

type DateRow = { id?: string; session_date: string; start_time: string; end_time: string; room: string | null; location: string | null; capacity: number | null };
const field = "min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent";
const localDateTime = (value: string | null) => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60_000).toISOString().slice(0,16) : "";

export default function OpportunityEditForms({ opportunity: o, initialDates, responsibility, services, suggestedSaturdays }: {
  opportunity: Opportunity;
  initialDates: DateRow[];
  responsibility: Responsibility | "admin";
  services: { id: string; name: string }[];
  suggestedSaturdays: string[];
}) {
  const [dates, setDates] = useState(initialDates);
  const [publishedAt, setPublishedAt] = useState(localDateTime(o.published_at));
  const [publication, setPublication] = useState(o.publication_status);
  const [title, setTitle] = useState(o.title);
  const [type, setType] = useState(opportunityType(o));
  const [emoji, setEmoji] = useState(opportunityEmoji(o.banner_emoji));
  const [contentState, contentAction, contentPending] = useActionState(saveOpportunityContent, null);
  const [managementState, managementAction, managementPending] = useActionState(saveOpportunityManagement, null);
  const manager = responsibility === "manager" || responsibility === "admin";
  const addDate = (date = "") => {
    if (date && dates.some((row) => row.session_date === date)) return;
    setDates((rows) => [...rows, { session_date: date, start_time: "14:00", end_time: "17:00", room: null, location: null, capacity: o.capacity }]);
  };

  return (
    <div className="space-y-5">
      <details open className="rounded-3xl border border-border bg-background p-5 sm:p-7">
        <summary className="cursor-pointer font-title text-[21px]">Présentation et contenu</summary>
        <form action={contentAction} className="mt-5 grid gap-5 sm:grid-cols-2">
          <input type="hidden" name="opportunity_id" value={o.id} />
          <div className="sm:col-span-2"><Label>Présentation</Label><RichTextEditor name="description" rows={7} defaultValue={o.description} /></div>
          <div className="sm:col-span-2"><DynamicListInput name="objectives_items" label="Objectifs" initialValue={o.objectives} placeholder="Un objectif" /></div>
          <StrategicAxesFields
            title={title}
            type={type}
            objectives={o.objectives}
            description={o.description}
            initial={{
              axes: o.strategic_axes,
            }}
          />
          <DynamicListInput name="speakers_items" label="Intervenants" initialValue={o.speakers} placeholder="Nom de l’intervenant" />
          <DynamicListInput name="prerequisites_items" label="Prérequis" initialValue={o.prerequisites} placeholder="Un prérequis" />
          <div className="sm:col-span-2"><DynamicListInput name="participant_material_items" label="Matériel à apporter" initialValue={o.participant_material} placeholder="Un élément à apporter" /></div>
          <section className="sm:col-span-2 rounded-2xl border border-amber-300/70 bg-amber-50/60 p-4 sm:p-5">
            <div className="mb-4"><h3 className="font-title text-[19px]">Besoins d’organisation</h3><p className="mt-1 text-xs leading-5 text-muted">À renseigner par l’équipe du projet. Ces informations de préparation sont destinées à Nathalie et Flora.</p></div>
            <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
              <label><Label>Nombre de places par séance</Label><input type="number" min={1} name="capacity" defaultValue={o.capacity ?? ""} className={field} placeholder="Illimité si vide" /><small className="mt-1.5 block text-xs text-muted">Appliqué à chaque séance.</small></label>
              <WorkshopMaterialsInput initialValue={o.organization_material} />
            </div>
          </section>
          {contentState && <p role="status" className={`sm:col-span-2 rounded-xl px-4 py-3 text-sm ${contentState.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>{contentState.message}</p>}
          <button disabled={contentPending} className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent disabled:opacity-60 sm:w-fit">{contentPending ? "Enregistrement…" : "Enregistrer le contenu"}</button>
        </form>
      </details>

      {manager && <>
        <details className="rounded-3xl border border-border bg-background p-5 sm:p-7">
          <summary className="cursor-pointer font-title text-[21px]">Informations générales et publication</summary>
          <form action={managementAction} className="mt-5 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="opportunity_id" value={o.id} />
            <label className="sm:col-span-2"><Label>Nom</Label><input name="title" required value={title} onChange={(event) => setTitle(event.target.value)} className={field} /></label>
            <fieldset className="sm:col-span-2"><legend className="mb-2 text-sm font-semibold">Type</legend><div className="grid gap-2 sm:grid-cols-3">{[["projet","Projet"],["formation","Formation"],["both","Projet et formation"]].map(([value,label]) => <label key={value}><input className="peer sr-only" type="radio" name="type" value={value} checked={type === value} onChange={() => setType(value as typeof type)} /><span className="block cursor-pointer rounded-xl border border-border px-3 py-3 text-center text-sm peer-checked:bg-accent peer-checked:text-on-accent">{label}</span></label>)}</div></fieldset>
            <div className="sm:col-span-2"><OpportunityEmojiPicker value={emoji} onChange={setEmoji} /></div>
            <label className="sm:col-span-2"><Label>Service pilote</Label><input name="service_name" list={`services-${o.id}`} defaultValue={o.services?.name ?? o.organizer_label ?? ""} className={field} /><datalist id={`services-${o.id}`}>{services.map((service) => <option key={service.id} value={service.name} />)}</datalist></label>
            <label><Label>Lieu principal</Label><input name="location" defaultValue={o.location ?? ""} className={field} /></label>
            <div className="sm:col-span-2 rounded-2xl bg-surface p-4"><p className="mb-3 text-sm font-semibold">Publication</p><div className="grid gap-3 sm:grid-cols-2"><select name="publication_status" value={publication} onChange={(event) => setPublication(event.target.value as Opportunity["publication_status"])} className={field}><option value="draft">Brouillon</option><option value="published">Demander la publication immédiate</option><option value="scheduled">Demander une publication programmée</option><option value="unpublished">Dépublié</option><option value="archived">Archivé</option></select>{publication === "scheduled" && <label><input type="datetime-local" value={publishedAt} onChange={(event) => setPublishedAt(event.target.value)} className={field} />{publishedAt && <input type="hidden" name="published_at" value={new Date(publishedAt).toISOString()} />}</label>}<label className="flex items-center gap-2 text-sm"><input type="checkbox" name="registration_open" defaultChecked={o.registration_open} /> Inscriptions ouvertes</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="cancellation_allowed" defaultChecked={o.cancellation_allowed} /> Annulation autorisée</label><p className="sm:col-span-2 text-xs leading-relaxed text-muted">La publication devient effective dès la validation de Nathalie Boudehent ou Flora Demerle.</p></div></div>
            {managementState && <p role="status" className={`sm:col-span-2 rounded-xl px-4 py-3 text-sm ${managementState.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>{managementState.message}</p>}
            <button disabled={managementPending} className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent disabled:opacity-60 sm:col-span-2 sm:w-fit">{managementPending ? "Enregistrement…" : "Enregistrer"}</button>
          </form>
        </details>

        <details className="rounded-3xl border border-border bg-background p-5 sm:p-7">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-title text-[21px]"><CalendarDays size={19} /> Dates et séances</summary>
          <form action={replaceOpportunityDates} className="mt-5 space-y-3">
            <input type="hidden" name="opportunity_id" value={o.id} />
            <div className="mb-4 flex flex-wrap gap-2">{suggestedSaturdays.map((date) => <button key={date} type="button" onClick={() => addDate(date)} className="rounded-full border border-border px-3 py-2 text-sm">{new Intl.DateTimeFormat("fr-FR",{day:"numeric",month:"long",timeZone:"UTC"}).format(new Date(`${date}T12:00:00Z`))}</button>)}<button type="button" onClick={() => addDate()} className="inline-flex items-center gap-1.5 rounded-full border border-foreground px-3 py-2 text-sm"><Plus size={15} /> Date personnalisée</button></div>
            {dates.map((date,index) => <div key={date.id ?? index} className="grid gap-2 rounded-2xl bg-surface p-3 md:grid-cols-[1.2fr_.7fr_.7fr_.7fr_auto]">
              <input type="hidden" name="date_id" value={date.id ?? ""} />
              {(["session_date","start_time","end_time"] as const).map((key) => <input key={key} type={key === "session_date" ? "date" : "time"} name={key} required value={date[key].slice(0,key === "session_date" ? 10 : 5)} onChange={(event) => setDates((rows) => rows.map((row,i) => i === index ? {...row,[key]:event.target.value} : row))} className={field} aria-label={key} />)}
              <input type="number" min={1} name="date_capacity" value={date.capacity ?? ""} onChange={(event) => setDates((rows) => rows.map((row,i) => i === index ? {...row,capacity:event.target.value ? Number(event.target.value) : null} : row))} placeholder="Places" className={field} />
              <input type="hidden" name="room" value={date.room ?? ""} /><input type="hidden" name="date_location" value={date.location ?? ""} />
              <button type="button" onClick={() => setDates((rows) => rows.filter((_,i) => i !== index))} aria-label="Supprimer"><Trash2 size={17} /></button>
            </div>)}
            <button className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent">Enregistrer les séances</button>
          </form>
        </details>
      </>}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) { return <span className="mb-1.5 block text-sm font-medium">{children}</span>; }
