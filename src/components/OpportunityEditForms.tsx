"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Opportunity, Responsibility } from "@/lib/data/opportunities";
import { opportunityType } from "@/lib/data/opportunities";
import { replaceOpportunityDates, updateOpportunityContent, updateOpportunityManagement } from "@/app/etudiant/services/actions";

type DateRow = { id?: string; session_date: string; start_time: string; end_time: string; room: string | null; location: string | null };
const field = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm";
const localDateTime = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export default function OpportunityEditForms({ opportunity: o, initialDates, responsibility, services }: {
  opportunity: Opportunity;
  initialDates: DateRow[];
  responsibility: Responsibility | "admin";
  services: { id: string; name: string }[];
}) {
  const [dates, setDates] = useState(initialDates);
  const [publishedAt, setPublishedAt] = useState(localDateTime(o.published_at));
  const manager = responsibility === "manager" || responsibility === "admin";
  return <div className="space-y-5">
    <details className="rounded-2xl border border-border bg-background p-5"><summary className="cursor-pointer font-medium">Compléter les informations</summary><form action={updateOpportunityContent} className="mt-4 grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="opportunity_id" value={o.id} />
      <label className="sm:col-span-2">Présentation détaillée<textarea name="description" rows={5} required defaultValue={o.description} className={`${field} mt-1`} /></label>
      <label className="sm:col-span-2">Objectifs<textarea name="objectives" rows={3} defaultValue={o.objectives ?? ""} className={`${field} mt-1`} /></label>
      <label>Intervenants<textarea name="speakers" rows={3} defaultValue={o.speakers ?? ""} className={`${field} mt-1`} /></label>
      <label>Prérequis<textarea name="prerequisites" rows={3} defaultValue={o.prerequisites ?? ""} className={`${field} mt-1`} /></label>
      <label>Matériel d’organisation<textarea name="organization_material" rows={3} defaultValue={o.organization_material ?? ""} className={`${field} mt-1`} /></label>
      <label>Matériel des participants<textarea name="participant_material" rows={3} defaultValue={o.participant_material ?? ""} className={`${field} mt-1`} /></label>
      <button className="rounded-full bg-accent px-5 py-2.5 text-sm text-on-accent sm:w-fit">Enregistrer le contenu</button>
    </form></details>
    {manager && <>
      <details className="rounded-2xl border border-border bg-background p-5"><summary className="cursor-pointer font-medium">Organisation et publication</summary><form action={updateOpportunityManagement} className="mt-4 grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="opportunity_id" value={o.id} />
        <label className="sm:col-span-2">Nom<input name="title" required defaultValue={o.title} className={`${field} mt-1`} /></label>
        <label className="sm:col-span-2">Présentation courte<textarea name="short_description" rows={2} defaultValue={o.short_description ?? ""} className={`${field} mt-1`} /></label>
        <label>Type<select name="type" defaultValue={opportunityType(o)} className={`${field} mt-1`}><option value="projet">Projet</option><option value="formation">Formation</option><option value="both">Projet et formation</option></select></label>
        <label>Service pilote<select name="service_id" defaultValue={o.service_id ?? ""} className={`${field} mt-1`}><option value="">— Aucun —</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
        <label>Organisateur<input name="organizer_label" defaultValue={o.organizer_label ?? ""} className={`${field} mt-1`} /></label>
        <label>Lieu<input name="location" defaultValue={o.location ?? ""} className={`${field} mt-1`} /></label>
        <label>Places<input type="number" min={1} name="capacity" defaultValue={o.capacity ?? ""} className={`${field} mt-1`} /></label>
        <label>Publication<select name="publication_status" defaultValue={o.publication_status} className={`${field} mt-1`}><option value="draft">Brouillon</option><option value="published">Publié</option><option value="scheduled">Programmé</option><option value="unpublished">Dépublié</option><option value="archived">Archivé</option></select></label>
        <label>Publication programmée<input type="datetime-local" value={publishedAt} onChange={(event) => setPublishedAt(event.target.value)} className={`${field} mt-1`} />{publishedAt && <input type="hidden" name="published_at" value={new Date(publishedAt).toISOString()} />}</label>
        <div className="space-y-2 self-end pb-2"><label className="flex gap-2"><input type="checkbox" name="registration_open" defaultChecked={o.registration_open} /> Inscriptions ouvertes</label><label className="flex gap-2"><input type="checkbox" name="cancellation_allowed" defaultChecked={o.cancellation_allowed} /> Annulation autorisée</label></div>
        <button className="rounded-full bg-accent px-5 py-2.5 text-sm text-on-accent sm:col-span-2 sm:w-fit">Enregistrer l’organisation</button>
      </form></details>
      <details className="rounded-2xl border border-border bg-background p-5"><summary className="cursor-pointer font-medium">Dates et séances</summary><form action={replaceOpportunityDates} className="mt-4 space-y-3"><input type="hidden" name="opportunity_id" value={o.id} />{dates.map((date, index) => <div key={date.id ?? index} className="grid gap-2 rounded-xl bg-surface p-3 md:grid-cols-[1.2fr_.7fr_.7fr_1fr_1fr_auto]">
        {(["session_date", "start_time", "end_time"] as const).map((key) => <input key={key} type={key === "session_date" ? "date" : "time"} name={key} required value={date[key].slice(0, key === "session_date" ? 10 : 5)} onChange={(event) => setDates((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: event.target.value } : row))} className={field} />)}
        {(["room", "location"] as const).map((key) => <input key={key} name={key === "location" ? "date_location" : key} value={date[key] ?? ""} onChange={(event) => setDates((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: event.target.value } : row))} placeholder={key === "room" ? "Salle" : "Lieu"} className={field} />)}
        <button type="button" onClick={() => setDates((rows) => rows.filter((_, rowIndex) => rowIndex !== index))} aria-label="Supprimer"><Trash2 size={17} /></button>
      </div>)}<div className="flex flex-wrap gap-2"><button type="button" onClick={() => setDates((rows) => [...rows, { session_date: "", start_time: "14:00", end_time: "17:00", room: null, location: null }])} className="inline-flex items-center gap-2 rounded-full border border-foreground px-4 py-2 text-sm"><Plus size={15} /> Ajouter une date</button><button className="rounded-full bg-accent px-5 py-2 text-sm text-on-accent">Enregistrer les séances</button></div></form></details>
    </>}
  </div>;
}
