import { Check, Clock, MapPin, PackageCheck, Users } from "lucide-react";
import { redirect } from "next/navigation";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import {
  getMyOpportunityDateRegistrationIds,
  getOpportunities,
  getOpportunityDateCounts,
  getOpportunityDates,
  getProjectsTrainingRights,
  isPublished,
  opportunityType,
  TYPE_LABEL,
} from "@/lib/data/opportunities";
import { linesOf } from "@/lib/opportunity-details";
import { cancelOpportunityDate, registerOpportunityDates } from "../actions";

const fullDate = (iso: string) => new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
const hm = (time: string) => time.slice(0,5).replace(":"," h ").replace(/ h 00$/," h");
const weekendKey = (iso: string) => {
  const date = new Date(`${iso}T12:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0,10);
};

function BulletList({ items }: { items: string[] }) {
  return <ul className="mt-4 grid gap-3 sm:grid-cols-2">{items.map((item,index) => <li key={`${item}-${index}`} className="flex items-start gap-3 rounded-xl bg-surface px-4 py-3 text-[15px] leading-6"><Check size={17} className="mt-1 shrink-0" />{item}</li>)}</ul>;
}
export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [all, registeredDates, rights, dates, dateCounts] = await Promise.all([
    getOpportunities(supabase),
    getMyOpportunityDateRegistrationIds(supabase, user.id),
    getProjectsTrainingRights(supabase, user.id),
    getOpportunityDates(supabase, id),
    getOpportunityDateCounts(supabase, id),
  ]);
  const o = all.find((item) => item.id === id);
  if (!o) redirect("/etudiant/services");
  const canPreview = rights.admin || rights.assignments.has(id);
  if (!isPublished(o) && !canPreview) redirect("/etudiant/services");

  const objectives = linesOf(o.objectives);
  const prerequisites = linesOf(o.prerequisites);
  const materials = linesOf(o.participant_material);
  const speakers = linesOf(o.speakers);
  const weekends = new Set(dates.map((date) => weekendKey(date.session_date))).size;
  const today = new Date().toISOString().slice(0,10);
  const coverUrl = o.cover_image_path
    ? supabase.storage.from("opportunity-covers").getPublicUrl(o.cover_image_path).data.publicUrl
    : null;
  const selectable = dates.filter((date) => {
    const taken = dateCounts.get(date.id) ?? 0;
    return !registeredDates.has(date.id) && date.session_date >= today && (date.capacity === null || taken < date.capacity);
  });

  return (
    <div className="space-y-5 pb-10">
      {!isPublished(o) && <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm"><strong>Mode aperçu :</strong> cette page est invisible des étudiants.</p>}
      <BackButton fallbackHref="/etudiant/services" fallbackLabel="Retour aux projets et formations" />

      <header className="relative min-h-[280px] overflow-hidden rounded-3xl bg-accent text-on-accent sm:min-h-[360px]">
        {coverUrl && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `linear-gradient(90deg,rgba(20,28,27,.88),rgba(20,28,27,.28)),url(${coverUrl})` }} />}
        {!coverUrl && <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,.18),transparent_34%),linear-gradient(135deg,#25312f,#111716)]" />}
        <div className="relative flex min-h-[280px] max-w-3xl flex-col justify-end p-6 sm:min-h-[360px] sm:p-10">
          <span className="w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">{TYPE_LABEL[opportunityType(o)]}</span>
          <h1 className="font-title mt-4 text-[36px] leading-[1.05] sm:text-[52px]">{o.title}</h1>
          <p className="mt-4 text-base text-white/80">{opportunityType(o) === "formation" ? "Une formation" : "Un parcours"} sur {weekends} week-end{weekends > 1 ? "s" : ""}</p>
        </div>
      </header>

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="space-y-9 rounded-3xl border border-border bg-background p-6 sm:p-9">
          <section><p className="label text-xs tracking-[.16em] text-muted">Présentation</p><div className="mt-3 max-w-[68ch] whitespace-pre-line text-[17px] leading-8 text-foreground">{o.description}</div></section>
          {objectives.length > 0 && <section className="border-t border-border-soft pt-7"><h2 className="font-title text-[25px]">Objectifs</h2><BulletList items={objectives} /></section>}
          {speakers.length > 0 && <section className="border-t border-border-soft pt-7"><h2 className="font-title text-[25px]">Intervenants</h2><p className="mt-3 text-[16px] leading-7 text-foreground">{speakers.join(" • ")}</p></section>}
          {prerequisites.length > 0 && <section className="border-t border-border-soft pt-7"><h2 className="font-title text-[25px]">Prérequis</h2><BulletList items={prerequisites} /></section>}
          {materials.length > 0 && <section className="border-t border-border-soft pt-7"><h2 className="font-title flex items-center gap-2 text-[25px]"><PackageCheck size={22} /> Matériel à apporter</h2><BulletList items={materials} /></section>}

          <section className="border-t border-border-soft pt-7">
            <h2 className="font-title text-[25px]">Les séances</h2>
            <p className="mt-1 text-sm text-muted">Choisissez uniquement les séances auxquelles vous souhaitez participer.</p>
            <form action={registerOpportunityDates} className="mt-5 space-y-3">
              <input type="hidden" name="opportunity_id" value={o.id} />
              {dates.map((date,index) => {
                const taken = dateCounts.get(date.id) ?? 0;
                const remaining = date.capacity === null ? null : Math.max(0,date.capacity-taken);
                const registered = registeredDates.has(date.id);
                const full = remaining === 0;
                const past = date.session_date < today;
                return <div key={date.id} className={`rounded-2xl border p-4 sm:p-5 ${registered ? "border-accent bg-accent/[.06]" : "border-border"}`}>
                  <div className="flex items-start gap-3">
                    {!registered && !past && !full && o.registration_open && <input type="checkbox" name="date_ids" value={date.id} className="mt-1 h-5 w-5 accent-[var(--accent)]" aria-label={`Sélectionner la séance ${index+1}`} />}
                    {registered && <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-accent text-on-accent"><Check size={14} /></span>}
                    <div className="min-w-0 flex-1"><p className="font-semibold capitalize text-foreground">{fullDate(date.session_date)}</p><p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted"><span className="inline-flex items-center gap-1.5"><Clock size={15} /> {hm(date.start_time)}–{hm(date.end_time)}</span>{(date.location || o.location) && <span className="inline-flex items-center gap-1.5"><MapPin size={15} /> {date.location || o.location}</span>}<span className="inline-flex items-center gap-1.5"><Users size={15} /> {remaining === null ? "Places illimitées" : full ? "Complet" : `${remaining} place${remaining>1?"s":""} restante${remaining>1?"s":""}`}</span></p></div>
                    {registered && o.cancellation_allowed && <button formAction={cancelOpportunityDate} name="date_id" value={date.id} className="shrink-0 text-xs font-semibold text-muted underline underline-offset-2">Annuler</button>}
                  </div>
                </div>;
              })}
              {selectable.length > 0 && o.registration_open && <button className="w-full rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-on-accent sm:w-auto">S’inscrire aux séances sélectionnées</button>}
            </form>
          </section>
        </article>

        <aside className="rounded-3xl border border-border bg-background p-6 lg:sticky lg:top-5">
          <p className="label text-xs tracking-[.14em] text-muted">Informations pratiques</p>
          <dl className="mt-4 divide-y divide-border-soft text-sm">
            {(o.services?.name || o.organizer_label) && <div className="py-3"><dt className="text-muted">Service pilote</dt><dd className="mt-1 font-semibold">{o.services?.name || o.organizer_label}</dd></div>}
            {o.location && <div className="py-3"><dt className="text-muted">Lieu principal</dt><dd className="mt-1 font-semibold">{o.location}</dd></div>}
            <div className="py-3"><dt className="text-muted">Durée</dt><dd className="mt-1 font-semibold">{weekends} week-end{weekends>1?"s":""} · {dates.length} séance{dates.length>1?"s":""}</dd></div>
          </dl>
          {registeredDates.size > 0 && <p className="mt-4 rounded-xl bg-surface px-4 py-3 text-sm font-medium">Vous êtes inscrit à {dates.filter((date) => registeredDates.has(date.id)).length} séance{dates.filter((date) => registeredDates.has(date.id)).length>1?"s":""}.</p>}
        </aside>
      </div>
    </div>
  );
}
