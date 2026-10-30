"use client";

import {
  CalendarDays,
  Check,
  Clock,
  ExternalLink,
  FileText,
  Link2,
  MapPin,
  PackageCheck,
  PackageOpen,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useActionState, useEffect, useState, type ReactNode } from "react";
import type { Opportunity } from "@/lib/data/opportunities";
import { lastPlacesLabel, opportunityType, TYPE_LABEL } from "@/lib/data/opportunities";
import type { OpportunityResource } from "@/lib/data/opportunity-resources";
import { saveOpportunityInline } from "@/app/etudiant/services/actions";
import DynamicListInput from "@/components/DynamicListInput";
import OpportunityEmojiPicker from "@/components/OpportunityEmojiPicker";
import RichTextEditor from "@/components/gestion/RichTextEditor";
import { opportunityEmoji } from "@/lib/opportunity-banner";
import StrategicAxesFields from "@/components/StrategicAxesFields";
import WorkshopMaterialsInput from "@/components/WorkshopMaterialsInput";
import OpportunityBanner from "@/components/OpportunityBanner";
import StrategicVisionSection from "@/components/StrategicVisionSection";
import FormattedContent from "@/components/FormattedContent";
import { linesOf } from "@/lib/opportunity-details";
import { formatSessionDate } from "@/lib/format";
import AdminSelect from "@/components/admin/AdminSelect";
import ParticipationConditionsFields from "@/components/ParticipationConditionsFields";
import ParticipationConditionsSummary from "@/components/ParticipationConditionsSummary";

type DateRow = { id?: string; session_date: string; start_time: string; end_time: string; room: string | null; location: string | null; capacity: number | null };
type TeamPerson = { user_id: string; full_name: string; responsibility: "manager" | "contributor"; can_edit: boolean };
type SessionParticipant = { opportunity_date_id: string; user_id: string; full_name: string };

const field = "min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/10";
const hm = (value: string) => value.slice(0, 5).replace(":", " h ").replace(/ h 00$/, " h");

export default function OpportunityEditForms({
  opportunity: o,
  initialDates,
  canEdit,
  canManage,
  services,
  suggestedSaturdays,
  team,
  sessionParticipants,
  resources,
  publicationLabel,
  canManageInternalMaterial,
  editExtras,
  experience = "supervision",
}: {
  opportunity: Opportunity;
  initialDates: DateRow[];
  canEdit: boolean;
  canManage: boolean;
  services: { id: string; name: string }[];
  suggestedSaturdays: string[];
  team: TeamPerson[];
  sessionParticipants: SessionParticipant[];
  resources: OpportunityResource[];
  publicationLabel: string;
  canManageInternalMaterial: boolean;
  editExtras?: ReactNode;
  experience?: "supervision" | "workspace";
}) {
  const workspace = experience === "workspace";
  const [editing, setEditing] = useState(workspace);
  const [dirty, setDirty] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [dates, setDates] = useState(initialDates);
  const [title, setTitle] = useState(o.title);
  const [type, setType] = useState(opportunityType(o));
  const [emoji, setEmoji] = useState(opportunityEmoji(o.banner_emoji));
  const [serviceName, setServiceName] = useState(o.services?.name ?? o.organizer_label ?? "");
  const [state, formAction, pending] = useActionState(saveOpportunityInline, null);
  const [handledSuccess, setHandledSuccess] = useState<typeof state>(null);

  if (state?.ok && state !== handledSuccess) {
    setHandledSuccess(state);
    setDirty(false);
    setEditing(workspace);
    setConfirmation(state.message);
  }

  useEffect(() => {
    if (!editing || !dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const protectLinks = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!target || target.getAttribute("target") === "_blank") return;
      if (!window.confirm("Vous avez des modifications non enregistrées. Quitter cette page ?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", protectLinks, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", protectLinks, true);
    };
  }, [dirty, editing]);

  const resetEditor = () => {
    setDates(initialDates);
    setTitle(o.title);
    setType(opportunityType(o));
    setEmoji(opportunityEmoji(o.banner_emoji));
    setServiceName(o.services?.name ?? o.organizer_label ?? "");
    setDirty(false);
    setEditing(workspace);
  };
  const cancel = () => {
    if (dirty && !window.confirm("Abandonner les modifications non enregistrées ?")) return;
    resetEditor();
  };
  const changeDates = (next: DateRow[]) => {
    setDates(next);
    setDirty(true);
  };
  const addDate = (date = "") => {
    if (date && dates.some((row) => row.session_date === date)) return;
    changeDates([...dates, { session_date: date, start_time: "14:00", end_time: "17:00", room: null, location: null, capacity: o.capacity }]);
  };

  if (!editing && !workspace) {
    return <Consultation
      opportunity={o}
      dates={initialDates}
      team={team}
      sessionParticipants={sessionParticipants}
      resources={resources}
      publicationLabel={publicationLabel}
      canEdit={canEdit}
      confirmation={confirmation}
      onEdit={() => { setConfirmation(null); setEditing(true); }}
    />;
  }

  return <div className="space-y-5">
    <form action={formAction} onChange={() => setDirty(true)} className="space-y-5">
      <input type="hidden" name="opportunity_id" value={o.id} />
      <div className="sticky top-3 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background/95 px-4 py-3 shadow-lg backdrop-blur sm:px-5">
        <div><p className="text-sm font-semibold">{workspace ? "Préparation du projet ou de la formation" : "Modification de la fiche"}</p><p className="text-xs text-muted">{workspace ? "Complétez la fiche progressivement puis soumettez-la lorsqu’elle est prête." : "Les champs sont enregistrés ensemble."}</p></div>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={cancel} disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold disabled:opacity-50"><X size={16} /> Annuler</button>
          <button disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-on-accent disabled:opacity-60"><Save size={16} /> {pending ? "Enregistrement…" : workspace ? "Enregistrer le brouillon" : "Enregistrer"}</button>
        </div>
        {workspace && confirmation && <p role="status" className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">{confirmation}</p>}
        {state && !state.ok && <p role="alert" className="w-full rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{state.message}</p>}
      </div>

      <section className="overflow-hidden rounded-3xl bg-[#202927] p-5 text-white sm:p-7">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start">
          <div className="space-y-5">
            <fieldset disabled={!canManage}><legend className="mb-2 text-xs font-semibold uppercase tracking-[.12em] text-white/60">Type</legend><div className="flex flex-wrap gap-2">{[["projet","Projet"],["formation","Formation"],["both","Projet et formation"]].map(([value,label]) => <label key={value}><input className="peer sr-only" type="radio" name="type" value={value} checked={type === value} onChange={() => setType(value as typeof type)} /><span className="block cursor-pointer rounded-full border border-white/20 px-3 py-2 text-xs font-semibold peer-checked:border-[#F4A12A] peer-checked:bg-[#F4A12A]">{label}</span></label>)}</div></fieldset>
            {!canManage && <input type="hidden" name="type" value={type} />}
            <label><Label light>Nom *</Label><input name="title" required readOnly={!canManage} value={title} onChange={(event) => setTitle(event.target.value)} className="min-h-14 w-full rounded-2xl border border-white/20 bg-white/10 px-4 font-title text-[25px] font-semibold text-white outline-none placeholder:text-white/40 read-only:opacity-75 focus:border-[#F4A12A] sm:text-[32px]" /></label>
          </div>
          <OpportunityEmojiPicker value={emoji} onChange={setEmoji} />
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <article className="space-y-6 rounded-3xl border border-border bg-background p-5 sm:p-7">
          <p className="rounded-xl bg-surface px-4 py-3 text-xs leading-relaxed text-muted">Les champs marqués d’un astérisque sont obligatoires. Les prérequis peuvent rester vides lorsque l’option « Prérequis nécessaires » n’est pas activée.</p>
          <section><SectionTitle>Présentation *</SectionTitle><RichTextEditor name="description" rows={8} defaultValue={o.description} /></section>
          <StrategicAxesFields title={title} type={type} objectives={o.objectives} description={o.description} initial={{ axes: o.strategic_axes }} />
          <DynamicListInput name="objectives_items" label="Objectifs" initialValue={o.objectives} placeholder="Un objectif" required />
          <DynamicListInput name="speakers_items" label="Intervenants" initialValue={o.speakers} placeholder="Nom de l’intervenant" required />
          <DynamicListInput name="prerequisites_items" label="Prérequis" initialValue={o.prerequisites} placeholder="Un prérequis" />
          <DynamicListInput name="tools_used_items" label="Outils utilisés (facultatif)" initialValue={o.tools_used} placeholder="Ex. ChatGPT, Canva ou Photoshop" />
          <DynamicListInput name="participant_material_items" label="Matériel à apporter (facultatif)" initialValue={o.participant_material} placeholder="Un élément à apporter" />
          <ParticipationConditionsFields initialAudience={o.participation_audience} initialAudienceDetails={o.participation_audience_details} initialPrerequisitesRequired={o.participation_prerequisites_required} />
        </article>

        <aside className="space-y-5 rounded-3xl border border-border bg-background p-5 sm:p-6">
          <SectionTitle>Organisation</SectionTitle>
          <label><Label>Service pilote *</Label><AdminSelect name="service_name" value={serviceName} onValueChange={(value) => { setServiceName(value); setDirty(true); }} disabled={!canManage} required searchable allowCustom placeholder="Choisir ou saisir un service" options={services.map((service) => ({ value: service.name, label: service.name }))} /></label>
          <label><Label>Lieu principal *</Label><input name="location" required readOnly={!canManage} defaultValue={o.location ?? ""} className={field} /></label>
          <label><Label>Nombre de places par séance *</Label><input type="number" min={1} name="capacity" required readOnly={!canManage} defaultValue={o.capacity ?? ""} className={field} placeholder="Ex. 20" /></label>
          {canManageInternalMaterial && <WorkshopMaterialsInput initialValue={o.organization_material} />}
          {canManage && <div className="rounded-2xl bg-surface p-4"><p className="mb-3 text-sm font-semibold">Inscriptions</p><div className="space-y-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="registration_open" defaultChecked={o.registration_open} /> Inscriptions ouvertes</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="cancellation_allowed" defaultChecked={o.cancellation_allowed} /> Annulation autorisée</label><p className="text-xs leading-relaxed text-muted">La publication se décide uniquement dans le bloc de validation, après examen complet de la fiche.</p></div></div>}
        </aside>
      </div>

      <section className="rounded-3xl border border-border bg-background p-5 sm:p-7">
        <SectionTitle>Dates et séances *</SectionTitle>
        {canManage ? <div className="mt-4 flex flex-wrap gap-2">{suggestedSaturdays.map((date) => <button key={date} type="button" onClick={() => addDate(date)} className="rounded-full border border-border px-3 py-2 text-sm">{new Intl.DateTimeFormat("fr-FR",{day:"numeric",month:"long",timeZone:"UTC"}).format(new Date(`${date}T12:00:00Z`))}</button>)}<button type="button" onClick={() => addDate()} className="inline-flex items-center gap-1.5 rounded-full border border-foreground px-3 py-2 text-sm"><Plus size={15} /> Date personnalisée</button></div> : <p className="mt-2 text-sm text-muted">Les dates sont modifiables uniquement par le responsable.</p>}
        <div className="mt-4 space-y-3">{dates.map((date,index) => {
          const registeredCount = date.id ? sessionParticipants.filter((person) => person.opportunity_date_id === date.id).length : 0;
          const remaining = date.capacity === null ? null : Math.max(0, date.capacity - registeredCount);
          const lastPlaces = lastPlacesLabel(remaining);
          return <div key={date.id ?? index} className="rounded-2xl bg-surface p-3">
            <div className="grid gap-2 md:grid-cols-[1.2fr_.7fr_.7fr_.7fr_auto]">
              <input type="hidden" name="date_id" value={date.id ?? ""} />
              {(["session_date","start_time","end_time"] as const).map((key) => <input key={key} type={key === "session_date" ? "date" : "time"} name={key} required readOnly={!canManage} value={date[key].slice(0,key === "session_date" ? 10 : 5)} onChange={(event) => canManage && changeDates(dates.map((row,i) => i === index ? {...row,[key]:event.target.value} : row))} className={field} aria-label={key} />)}
              <input type="number" min={1} name="date_capacity" readOnly={!canManage} value={date.capacity ?? ""} onChange={(event) => canManage && changeDates(dates.map((row,i) => i === index ? {...row,capacity:event.target.value ? Number(event.target.value) : null} : row))} placeholder="Places" className={field} />
              <input type="hidden" name="room" value={date.room ?? ""} /><input type="hidden" name="date_location" value={date.location ?? ""} />
              {canManage ? <button type="button" onClick={() => changeDates(dates.filter((_,i) => i !== index))} aria-label="Supprimer la séance" className="grid min-h-11 place-items-center text-muted hover:text-red-700"><Trash2 size={17} /></button> : <span />}
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-xs text-muted"><span><strong className="text-foreground">{registeredCount}{date.capacity === null ? "" : ` / ${date.capacity}`}</strong> inscription{registeredCount === 1 ? "" : "s"}</span>{lastPlaces && <span className="font-semibold text-[#9A5B00]">{lastPlaces}</span>}</p>
          </div>;
        })}</div>
      </section>
    </form>
    {editExtras}
  </div>;
}

function Consultation({ opportunity: o, dates, team, sessionParticipants, resources, publicationLabel, canEdit, confirmation, onEdit }: {
  opportunity: Opportunity;
  dates: DateRow[];
  team: TeamPerson[];
  sessionParticipants: SessionParticipant[];
  resources: OpportunityResource[];
  publicationLabel: string;
  canEdit: boolean;
  confirmation: string | null;
  onEdit: () => void;
}) {
  const objectives = linesOf(o.objectives);
  const prerequisites = linesOf(o.prerequisites);
  const materials = linesOf(o.participant_material);
  const speakers = linesOf(o.speakers);
  const tools = linesOf(o.tools_used);
  const managers = team.filter((person) => person.responsibility === "manager");
  const contributors = team.filter((person) => person.responsibility === "contributor");
  const distinctPeople = new Set(sessionParticipants.map((person) => person.user_id)).size;
  const firstDate = dates[0];

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      {confirmation ? <p role="status" className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900"><Check size={17} /> {confirmation}</p> : <span />}
      {canEdit && <button type="button" onClick={onEdit} className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-semibold transition hover:border-foreground"><Pencil size={16} /> Modifier</button>}
    </div>

    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <article className="overflow-hidden rounded-3xl border border-border bg-background">
        <OpportunityBanner emoji={o.banner_emoji} title={o.title} typeLabel={TYPE_LABEL[opportunityType(o)]} status={publicationLabel} variant="admin" details={firstDate ? <div className="grid gap-2.5"><span className="flex items-center gap-2"><CalendarDays size={17} /> {formatSessionDate(firstDate.session_date)}</span><span className="flex items-center gap-2"><Clock size={17} /> {hm(firstDate.start_time)}–{hm(firstDate.end_time)}</span>{(firstDate.location || o.location) && <span className="flex items-start gap-2"><MapPin className="mt-0.5 shrink-0" size={17} /><strong className="font-medium text-white">{firstDate.location || o.location}</strong></span>}</div> : undefined} />
        <div className="space-y-8 p-6 sm:p-8">
          <section><p className="label text-xs tracking-[.16em] text-muted">Présentation</p><div className="mt-4 max-w-[72ch]"><FormattedContent value={o.description} /></div></section>
          <StrategicVisionSection opportunity={o} showIncomplete />
          {objectives.length > 0 && <ViewSection title="Objectifs"><BulletList items={objectives} /></ViewSection>}
          {prerequisites.length > 0 && !o.participation_prerequisites_required && <ViewSection title="Prérequis"><BulletList items={prerequisites} /></ViewSection>}
          <ViewSection title="Conditions de participation"><ParticipationConditionsSummary audience={o.participation_audience} audienceDetails={o.participation_audience_details} prerequisitesRequired={o.participation_prerequisites_required} prerequisites={prerequisites} /></ViewSection>
          {tools.length > 0 && <ViewSection title="Outils utilisés"><BulletList items={tools} /></ViewSection>}
          {materials.length > 0 && <ViewSection title="Matériel à apporter" icon={<PackageCheck size={21} />}><BulletList items={materials} /></ViewSection>}
          {resources.length > 0 && <ViewSection title="Supports et ressources"><div className="mt-4 grid gap-3 sm:grid-cols-2">{resources.map((resource) => { const Icon = resource.kind === "support" ? FileText : resource.kind === "link" ? Link2 : PackageOpen; return <a key={resource.id} href={`/etudiant/services/${o.id}/ressources/${resource.id}/ouvrir`} target="_blank" rel="noreferrer" className="group flex items-start gap-3 rounded-2xl border border-border bg-background p-4 transition hover:border-foreground"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface"><Icon size={19} /></span><span className="min-w-0 flex-1"><strong className="block break-words text-sm">{resource.title}</strong>{resource.description && <span className="mt-1.5 block whitespace-pre-line text-sm leading-5 text-muted">{resource.description}</span>}<small className="mt-1.5 block text-muted">{resource.kind === "support" ? "Support de cours" : resource.kind === "link" ? "Lien" : "Ressource"}</small></span><ExternalLink size={15} className="mt-1 shrink-0 text-muted" /></a>; })}</div></ViewSection>}
          {dates.length > 0 && <ViewSection title="Les séances"><div className="mt-4 space-y-3">{dates.map((date) => <div key={date.id} className="rounded-2xl border border-border p-4"><p className="font-semibold capitalize">{formatSessionDate(date.session_date)}</p><p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted"><span className="inline-flex items-center gap-1.5"><Clock size={15} /> {hm(date.start_time)}–{hm(date.end_time)}</span>{(date.location || o.location) && <span className="inline-flex items-center gap-1.5"><MapPin size={15} /> {date.location || o.location}</span>}</p></div>)}</div></ViewSection>}
          {team.length > 0 && <ViewSection title="Responsables et contributeurs"><div className="mt-4 grid gap-3 sm:grid-cols-2">{managers.map((person) => <div key={person.user_id} className="rounded-xl bg-surface px-4 py-3"><strong className="block text-sm">{person.full_name}</strong><span className="text-xs text-muted">Responsable</span></div>)}{contributors.map((person) => <div key={person.user_id} className="rounded-xl bg-surface px-4 py-3"><strong className="block text-sm">{person.full_name}</strong><span className="text-xs text-muted">Contributeur · {person.can_edit ? "peut modifier" : "lecture seule"}</span></div>)}</div></ViewSection>}
        </div>
      </article>

      <aside className="space-y-5 rounded-3xl border border-border bg-background p-5 sm:p-6 lg:sticky lg:top-5">
        <div><p className="label text-xs tracking-[.14em] text-muted">Organisation</p><dl className="mt-3 divide-y divide-border-soft text-sm">
          <Definition label="Service pilote" value={o.services?.name || o.organizer_label} />
          <Definition label="Responsable" value={managers.map((person) => person.full_name).join(" • ") || "Non désigné"} />
          <Definition label="Intervenants" value={speakers.join(" • ") || "Non renseignés"} />
          <Definition label="Lieu principal" value={o.location} />
        </dl></div>
        <section className="border-t border-border-soft pt-5"><h2 className="font-title text-[19px]">Inscriptions par séance ({distinctPeople} personne{distinctPeople === 1 ? "" : "s"})</h2><div className="mt-3 space-y-3">{dates.map((date) => { const people = sessionParticipants.filter((person) => person.opportunity_date_id === date.id); const remaining = date.capacity === null ? null : Math.max(0, date.capacity - people.length); const lastPlaces = lastPlacesLabel(remaining); return <div key={date.id} className="rounded-xl bg-surface p-3"><p className="text-xs font-semibold capitalize">{formatSessionDate(date.session_date)} · {people.length}{date.capacity === null ? "" : ` / ${date.capacity}`} inscrit{people.length === 1 ? "" : "s"}</p>{lastPlaces && <p className="mt-1 text-xs font-semibold text-[#9A5B00]">{lastPlaces}</p>}<p className="mt-1 text-xs leading-5 text-muted">{people.length ? people.map((person) => person.full_name).join(" • ") : "Aucune inscription"}</p></div>; })}{dates.length === 0 && <p className="text-sm text-muted">Aucune séance programmée.</p>}</div></section>
      </aside>
    </div>
  </div>;
}

function BulletList({ items }: { items: string[] }) {
  return <ul className="mt-4 grid gap-3 sm:grid-cols-2">{items.map((item,index) => <li key={`${item}-${index}`} className="flex items-start gap-3 rounded-xl bg-surface px-4 py-3 text-[15px] leading-6"><Check size={17} className="mt-1 shrink-0" />{item}</li>)}</ul>;
}

function ViewSection({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return <section className="border-t border-border-soft pt-7"><h2 className="font-title flex items-center gap-2 text-[24px]">{icon}{title}</h2>{children}</section>;
}

function Definition({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return <div className="py-3"><dt className="text-muted">{label}</dt><dd className="mt-1 font-semibold leading-6">{value}</dd></div>;
}

function Label({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <span className={`mb-1.5 block text-sm font-medium ${light ? "text-white/75" : "text-foreground"}`}>{children}</span>;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="font-title mb-4 text-[22px] text-foreground">{children}</h2>;
}
