"use client";

import { CalendarDays, Plus, Search, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { createOpportunity } from "@/app/etudiant/services/actions";
import DynamicListInput from "@/components/DynamicListInput";
import OpportunityBanner from "@/components/OpportunityBanner";
import OpportunityEmojiPicker from "@/components/OpportunityEmojiPicker";
import RichTextEditor from "@/components/gestion/RichTextEditor";
import { DEFAULT_OPPORTUNITY_EMOJI } from "@/lib/opportunity-banner";
import StrategicAxesFields from "@/components/StrategicAxesFields";
import WorkshopMaterialsInput from "@/components/WorkshopMaterialsInput";
import AdminSelect from "@/components/admin/AdminSelect";
import ParticipationConditionsFields from "@/components/ParticipationConditionsFields";

type Member = { id: string; full_name: string; email: string };
type DateRow = { date: string; start: string; end: string };
const field = "min-h-12 w-full rounded-xl border border-border bg-background px-3 text-[15px] text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/10";

export default function OpportunityCreateForm({ creationToken, members, services, suggestedSaturdays, canManageInternalMaterial, canAssignMembers, adminScope = false }: {
  creationToken: string;
  members: Member[];
  services: { id: string; name: string }[];
  suggestedSaturdays: string[];
  canManageInternalMaterial: boolean;
  canAssignMembers: boolean;
  adminScope?: boolean;
}) {
  const [dates, setDates] = useState<DateRow[]>([]);
  const [query, setQuery] = useState("");
  const [managers, setManagers] = useState(new Set<string>());
  const [contributors, setContributors] = useState(new Set<string>());
  const [title, setTitle] = useState("");
  const [type, setType] = useState("projet");
  const [emoji, setEmoji] = useState(DEFAULT_OPPORTUNITY_EMOJI);
  const [serviceName, setServiceName] = useState("");
  const shown = useMemo(() => {
    const value = query.trim().toLocaleLowerCase("fr-FR");
    return value ? members.filter((member) => `${member.full_name} ${member.email}`.toLocaleLowerCase("fr-FR").includes(value)) : members;
  }, [members, query]);
  const addDate = (date = "") => {
    if (date && dates.some((row) => row.date === date)) return;
    setDates((rows) => [...rows, { date, start: "14:00", end: "17:00" }]);
  };
  const updateDate = (index: number, key: keyof DateRow, value: string) =>
    setDates((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  const selectPerson = (id: string, responsibility: "manager" | "contributor", checked: boolean) => {
    const own = new Set(responsibility === "manager" ? managers : contributors);
    const other = new Set(responsibility === "manager" ? contributors : managers);
    if (checked) own.add(id); else own.delete(id);
    if (checked) other.delete(id);
    if (responsibility === "manager") { setManagers(own); setContributors(other); }
    else { setContributors(own); setManagers(other); }
  };

  return (
    <form action={createOpportunity} className="space-y-6">
      <input type="hidden" name="creation_token" value={creationToken} />
      <input type="hidden" name="return_scope" value={adminScope ? "admin" : "workspace"} />
      <section className="overflow-hidden rounded-3xl border border-border bg-background">
        <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-2">
          <div className="lg:col-span-2"><p className="label text-xs tracking-[.14em] text-muted">INFORMATIONS GÉNÉRALES</p><h2 className="font-title mt-1 text-[22px] text-foreground">Le projet ou la formation</h2></div>
          <p className="lg:col-span-2 rounded-xl bg-surface px-4 py-3 text-xs leading-relaxed text-muted">Les champs marqués d’un astérisque sont obligatoires. Les prérequis peuvent rester vides lorsque l’option « Prérequis nécessaires » n’est pas activée.</p>
          <label className="lg:col-span-2"><Label>Titre *</Label><input name="title" required value={title} onChange={(event) => setTitle(event.target.value)} className={field} placeholder="Titre du projet ou de la formation" autoComplete="off" /></label>
          <fieldset className="lg:col-span-2"><legend className="mb-2 text-sm font-semibold">Type</legend><div className="grid gap-2 sm:grid-cols-3">{[["projet","Projet"],["formation","Formation"],["both","Projet et formation"]].map(([value,label]) => <label key={value} className="cursor-pointer"><input type="radio" name="type" value={value} checked={type === value} onChange={() => setType(value)} className="peer sr-only" /><span className="block rounded-xl border border-border px-4 py-3 text-center text-sm font-medium peer-checked:border-accent peer-checked:bg-accent peer-checked:text-on-accent">{label}</span></label>)}</div></fieldset>
          <div className="lg:col-span-2"><OpportunityEmojiPicker value={emoji} onChange={setEmoji} /></div>
          <div className="lg:col-span-2 overflow-hidden rounded-2xl" aria-label="Aperçu de la bannière">
            <OpportunityBanner emoji={emoji} title={title || "Titre du projet ou de la formation"} typeLabel={type === "both" ? "Projet et formation" : type === "formation" ? "Formation" : "Projet"} variant="preview" />
          </div>
          <label className="lg:col-span-2"><Label>Service pilote *</Label><AdminSelect name="service_name" value={serviceName} onValueChange={setServiceName} required searchable allowCustom placeholder="Choisir ou saisir un nouveau service" options={services.map((service) => ({ value: service.name, label: service.name }))} /></label>
          <div className="lg:col-span-2"><Label>Présentation *</Label><RichTextEditor name="description" rows={7} placeholder="Présentez l’activité, son intérêt et son déroulement…" /></div>
          <div className="lg:col-span-2"><DynamicListInput name="objectives_items" label="Objectifs" placeholder="Un objectif" required /></div>
          <StrategicAxesFields title={title} type={type as "projet" | "formation" | "both"} />
          <DynamicListInput name="speakers_items" label="Intervenants" placeholder="Nom de l’intervenant" required />
          <DynamicListInput name="prerequisites_items" label="Prérequis" placeholder="Un prérequis" />
          <div className="lg:col-span-2"><DynamicListInput name="tools_used_items" label="Outils utilisés (facultatif)" placeholder="Ex. ChatGPT, Canva ou Photoshop" /></div>
          <div className="lg:col-span-2"><ParticipationConditionsFields /></div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-background p-5 sm:p-7">
        <h2 className="font-title text-[23px]">Organisation</h2>
        <p className="mt-1 text-sm text-muted">Les besoins internes permettent aux super administrateurs de préparer l’atelier.</p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <label><Label>Lieu principal *</Label><input name="location" required className={field} placeholder="Espace Martin Luther King" /></label>
          <label><Label>Nombre de places par séance *</Label><input type="number" min={1} name="capacity" required className={field} placeholder="Ex. 20" /></label>
          <div className="sm:col-span-2"><DynamicListInput name="participant_material_items" label="Matériel à apporter (facultatif)" placeholder="Un élément à apporter" /></div>
          {canManageInternalMaterial && <div className="sm:col-span-2"><WorkshopMaterialsInput /></div>}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-background p-5 sm:p-7">
        <div className="flex items-start gap-3"><CalendarDays className="mt-1 text-muted" size={21} /><div><h2 className="font-title text-[23px]">Dates des séances *</h2><p className="mt-1 text-sm text-muted">Premiers samedis de novembre à juin, ou dates personnalisées.</p></div></div>
        <div className="mt-4 flex flex-wrap gap-2">{suggestedSaturdays.map((date) => <button key={date} type="button" onClick={() => addDate(date)} className="rounded-full border border-border px-3 py-2 text-sm hover:border-foreground">{new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`))}</button>)}<button type="button" onClick={() => addDate()} className="inline-flex items-center gap-1.5 rounded-full border border-foreground px-3 py-2 text-sm"><Plus size={15} /> Date personnalisée</button></div>
        <div className="mt-4 space-y-3">{dates.map((row, index) => <div key={`${row.date}-${index}`} className="grid gap-2 rounded-2xl bg-surface p-3 sm:grid-cols-[1.3fr_.8fr_.8fr_auto]">
          <input type="date" name="session_date" required value={row.date} onChange={(event) => updateDate(index,"date",event.target.value)} className={field} aria-label="Date" />
          <input type="time" name="start_time" required value={row.start} onChange={(event) => updateDate(index,"start",event.target.value)} className={field} aria-label="Début" />
          <input type="time" name="end_time" required value={row.end} onChange={(event) => updateDate(index,"end",event.target.value)} className={field} aria-label="Fin" />
          <button type="button" onClick={() => setDates((rows) => rows.filter((_,i) => i !== index))} aria-label="Supprimer la séance" className="p-3 text-muted hover:text-red-700"><Trash2 size={17} /></button>
        </div>)}</div>
      </section>

      {canAssignMembers && <details className="rounded-3xl border border-border bg-background p-5 sm:p-7">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-title text-[21px]"><Users size={19} /> Responsables et contributeurs</summary>
        <div className="mt-4"><label className="relative block max-w-lg"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un membre" className={`${field} pl-9`} /></label>
        <div className="mt-3 max-h-72 overflow-auto rounded-2xl border border-border">{shown.map((member) => <div key={member.id} className="grid gap-2 border-b border-border-soft px-4 py-3 last:border-0 sm:grid-cols-[1fr_auto_auto]"><span className="min-w-0 text-sm"><strong>{member.full_name}</strong><small className="ml-2 text-muted">{member.email}</small></span><label className="flex gap-2 text-sm"><input type="checkbox" checked={managers.has(member.id)} onChange={(event) => selectPerson(member.id,"manager",event.target.checked)} /> Responsable</label><label className="flex gap-2 text-sm"><input type="checkbox" checked={contributors.has(member.id)} onChange={(event) => selectPerson(member.id,"contributor",event.target.checked)} /> Contributeur</label></div>)}</div></div>
        {[...managers].map((id) => <input key={`m-${id}`} type="hidden" name="manager_ids" value={id} />)}{[...contributors].map((id) => <input key={`c-${id}`} type="hidden" name="contributor_ids" value={id} />)}
      </details>}

      <details className="rounded-2xl border border-border bg-background p-5">
        <summary className="cursor-pointer text-sm font-semibold">Inscriptions</summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2"><input type="hidden" name="publication_status" value="draft" /><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="registration_open" defaultChecked /> Inscriptions ouvertes</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="cancellation_allowed" defaultChecked /> Annulation autorisée</label><p className="sm:col-span-2 rounded-xl bg-surface px-4 py-3 text-xs leading-relaxed text-muted">L’élément est créé en brouillon. Le responsable pourra le soumettre lorsqu’il sera prêt ; seul un super administrateur choisira ensuite la publication.</p></div>
      </details>
      <CreateButton />
    </form>
  );
}
function CreateButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="w-full rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-on-accent disabled:cursor-wait disabled:opacity-60 sm:w-auto">{pending ? "Création en cours…" : "Créer l’élément"}</button>;
}
function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block text-sm font-medium text-foreground">{children}</span>;
}
