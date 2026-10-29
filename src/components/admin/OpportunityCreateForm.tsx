"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { createOpportunity } from "@/app/etudiant/services/actions";

type Member = { id: string; full_name: string; email: string };
type DateRow = { date: string; start: string; end: string; room: string; location: string };
const field = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground";

export default function OpportunityCreateForm({ members, services, suggestedSaturdays }: {
  members: Member[];
  services: { id: string; name: string }[];
  suggestedSaturdays: string[];
}) {
  const [dates, setDates] = useState<DateRow[]>([]);
  const [query, setQuery] = useState("");
  const [managers, setManagers] = useState(new Set<string>());
  const [contributors, setContributors] = useState(new Set<string>());
  const [publishedAt, setPublishedAt] = useState("");
  const shown = useMemo(() => {
    const value = query.trim().toLowerCase();
    return value ? members.filter((member) => `${member.full_name} ${member.email}`.toLowerCase().includes(value)) : members;
  }, [members, query]);
  const addDate = (date = "") => {
    if (date && dates.some((row) => row.date === date)) return;
    setDates((rows) => [...rows, { date, start: "14:00", end: "17:00", room: "", location: "" }]);
  };
  const updateDate = (index: number, key: keyof DateRow, value: string) =>
    setDates((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  const selectPerson = (id: string, responsibility: "manager" | "contributor", checked: boolean) => {
    const own = responsibility === "manager" ? managers : contributors;
    const other = responsibility === "manager" ? contributors : managers;
    const setOwn = responsibility === "manager" ? setManagers : setContributors;
    const setOther = responsibility === "manager" ? setContributors : setManagers;
    const next = new Set(own);
    if (checked) next.add(id); else next.delete(id);
    setOwn(next);
    if (checked) { const opposite = new Set(other); opposite.delete(id); setOther(opposite); }
  };

  return <form action={createOpportunity} className="space-y-8">
    <Fieldset title="Informations générales">
      <label className="sm:col-span-2"><Label>Nom *</Label><input name="title" required className={field} /></label>
      <label><Label>Type *</Label><select name="type" defaultValue="projet" className={field}><option value="projet">Projet</option><option value="formation">Formation</option><option value="both">Projet et formation</option></select></label>
      <label><Label>Service pilote</Label><select name="service_id" defaultValue="" className={field}><option value="">— Aucun —</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
      <label className="sm:col-span-2"><Label>Présentation courte</Label><textarea name="short_description" rows={2} maxLength={240} className={field} /></label>
      <label className="sm:col-span-2"><Label>Présentation détaillée *</Label><textarea name="description" rows={5} required className={field} /></label>
      <label className="sm:col-span-2"><Label>Objectifs</Label><textarea name="objectives" rows={3} className={field} /></label>
      <label><Label>Intervenants</Label><textarea name="speakers" rows={3} className={field} /></label>
      <label><Label>Prérequis</Label><textarea name="prerequisites" rows={3} className={field} /></label>
      <label className="sm:col-span-2"><Label>Libellé de l’organisateur</Label><input name="organizer_label" className={field} /></label>
    </Fieldset>

    <Fieldset title="Organisation">
      <label><Label>Lieu principal</Label><input name="location" className={field} /></label>
      <label><Label>Nombre de places</Label><input type="number" min={1} name="capacity" placeholder="Vide = illimité" className={field} /></label>
      <label><Label>Matériel nécessaire à l’organisation</Label><textarea name="organization_material" rows={3} className={field} /></label>
      <label><Label>Matériel à apporter par les participants</Label><textarea name="participant_material" rows={3} className={field} /></label>
      <label className="sm:col-span-2"><Label>Résumé du calendrier</Label><input name="schedule_label" placeholder="Ex. Trois samedis de 14 h à 17 h" className={field} /></label>
    </Fieldset>

    <fieldset>
      <legend className="font-title text-[22px]">Dates et séances</legend>
      <p className="mt-1 text-sm text-muted">Sélectionnez les premiers samedis de novembre à juin ou ajoutez une date personnalisée.</p>
      <div className="mt-3 flex flex-wrap gap-2">{suggestedSaturdays.map((date) => <button key={date} type="button" onClick={() => addDate(date)} className="rounded-lg border border-border px-3 py-2 text-sm hover:border-foreground">{new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`))}</button>)}<button type="button" onClick={() => addDate()} className="inline-flex items-center gap-1.5 rounded-lg border border-foreground px-3 py-2 text-sm"><Plus size={15} /> Date personnalisée</button></div>
      <div className="mt-4 space-y-3">{dates.map((row, index) => <div key={`${row.date}-${index}`} className="grid gap-2 rounded-xl bg-surface p-3 md:grid-cols-[1.2fr_.7fr_.7fr_1fr_1fr_auto]">
        <input type="date" name="session_date" required value={row.date} onChange={(event) => updateDate(index, "date", event.target.value)} className={field} aria-label="Date" />
        <input type="time" name="start_time" required value={row.start} onChange={(event) => updateDate(index, "start", event.target.value)} className={field} aria-label="Début" />
        <input type="time" name="end_time" required value={row.end} onChange={(event) => updateDate(index, "end", event.target.value)} className={field} aria-label="Fin" />
        <input name="room" value={row.room} onChange={(event) => updateDate(index, "room", event.target.value)} placeholder="Salle" className={field} />
        <input name="date_location" value={row.location} onChange={(event) => updateDate(index, "location", event.target.value)} placeholder="Lieu spécifique" className={field} />
        <button type="button" onClick={() => setDates((rows) => rows.filter((_, rowIndex) => rowIndex !== index))} className="p-2 text-muted" aria-label="Supprimer la date"><Trash2 size={17} /></button>
      </div>)}</div>
    </fieldset>

    <fieldset>
      <legend className="font-title text-[22px]">Responsables et contributeurs</legend>
      <label className="relative mt-3 block max-w-lg"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un membre" className={`${field} pl-9`} /></label>
      <div className="mt-3 max-h-72 overflow-auto rounded-xl border border-border">{shown.map((member) => <div key={member.id} className="grid gap-2 border-b border-border-soft px-4 py-3 last:border-0 sm:grid-cols-[1fr_auto_auto]"><span className="min-w-0 text-sm"><strong>{member.full_name}</strong><small className="ml-2 text-muted">{member.email}</small></span><label className="flex gap-2 text-sm"><input type="checkbox" checked={managers.has(member.id)} onChange={(event) => selectPerson(member.id, "manager", event.target.checked)} /> Responsable</label><label className="flex gap-2 text-sm"><input type="checkbox" checked={contributors.has(member.id)} onChange={(event) => selectPerson(member.id, "contributor", event.target.checked)} /> Contributeur</label></div>)}</div>
      {[...managers].map((id) => <input key={`manager-${id}`} type="hidden" name="manager_ids" value={id} />)}
      {[...contributors].map((id) => <input key={`contributor-${id}`} type="hidden" name="contributor_ids" value={id} />)}
    </fieldset>

    <Fieldset title="Publication">
      <label><Label>État</Label><select name="publication_status" defaultValue="draft" className={field}><option value="draft">Brouillon</option><option value="published">Publier immédiatement</option><option value="scheduled">Programmer la publication</option><option value="unpublished">Dépublier</option></select></label>
      <label><Label>Date et heure programmées</Label><input type="datetime-local" value={publishedAt} onChange={(event) => setPublishedAt(event.target.value)} className={field} />{publishedAt && <input type="hidden" name="published_at" value={new Date(publishedAt).toISOString()} />}</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="registration_open" defaultChecked /> Inscriptions ouvertes à la publication</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="cancellation_allowed" defaultChecked /> Annulation autorisée</label>
    </Fieldset>
    <button className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent">Créer l’élément</button>
    <p className="text-xs text-muted">La création et les affectations n’envoient aucune notification.</p>
  </form>;
}

function Fieldset({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset className="grid gap-4 sm:grid-cols-2"><legend className="font-title mb-4 text-[22px]">{title}</legend>{children}</fieldset>;
}
function Label({ children }: { children: React.ReactNode }) { return <span className="mb-1 block text-xs text-muted">{children}</span>; }
