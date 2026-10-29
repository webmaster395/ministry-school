import Link from "next/link";
import { CalendarDays, CheckCircle2, ChevronLeft, Clock, MapPin, Users } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMembers } from "@/lib/data/admin-hub";
import { getOpportunity, getOpportunityCounts, getOpportunityDates, getProjectsTrainingRights, getServices, opportunityType, TYPE_LABEL } from "@/lib/data/opportunities";
import { formatSessionDate } from "@/lib/format";
import OpportunityEditForms from "@/components/OpportunityEditForms";
import AssignmentEditor from "@/components/admin/AssignmentEditor";
import OpportunityBanner from "@/components/OpportunityBanner";
import OpportunityReviewPanel from "@/components/OpportunityReviewPanel";
import { getOpportunityReviewState } from "@/lib/data/opportunity-review";
import { getOpportunityResources } from "@/lib/data/opportunity-resources";
import OpportunityResourcesEditor from "@/components/OpportunityResourcesEditor";
import StrategicVisionSection from "@/components/StrategicVisionSection";

function firstSaturday(year: number, month: number) {
  const date = new Date(Date.UTC(year, month, 1));
  date.setUTCDate(1 + ((6 - date.getUTCDay() + 7) % 7));
  return date.toISOString().slice(0, 10);
}

export default async function ProjectsTrainingManageDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ creation?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/connexion");
  const [opportunity, dates, counts, rights, services] = await Promise.all([
    getOpportunity(supabase, id),
    getOpportunityDates(supabase, id),
    getOpportunityCounts(supabase),
    getProjectsTrainingRights(supabase, user.id),
    getServices(supabase),
  ]);
  if (!opportunity) notFound();
  const responsibility = rights.admin ? "admin" : rights.assignments.get(id);
  if (!responsibility) redirect("/gestion/projets-formations");
  const canManage = responsibility === "admin" || responsibility === "manager";
  const [{ data: team }, { data: participants }, { data: sessionParticipants }, reviewState, resources] = await Promise.all([
    supabase.rpc("opportunity_team", { p_opportunity: id }),
    supabase.rpc("opportunity_participants", { p_opp: id }),
    supabase.rpc("opportunity_session_participants", { p_opp: id }),
    getOpportunityReviewState(supabase, id),
    getOpportunityResources(supabase, id),
  ]);
  const teamRows = (team ?? []) as { user_id: string; full_name: string; responsibility: "manager" | "contributor" }[];
  const participantRows = (participants ?? []) as { full_name: string }[];
  const sessionParticipantRows = (sessionParticipants ?? []) as { opportunity_date_id: string; user_id: string; full_name: string }[];
  const members = rights.admin ? await getMembers(supabase) : [];
  const taken = counts.get(id) ?? participantRows.length;
  const now = new Date();
  const schoolYear = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const suggestedSaturdays = [10, 11, 0, 1, 2, 3, 4, 5].map((month) => firstSaturday(month >= 10 ? schoolYear : schoolYear + 1, month));
  const publicationLabel = opportunity.publication_status === "scheduled" ? "Publication programmée" : opportunity.publication_status === "published" ? "Publié" : opportunity.publication_status === "archived" ? "Archivé" : "Non publié";

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/gestion/projets-formations" className="inline-flex items-center gap-1.5 text-sm text-muted"><ChevronLeft size={16} /> Projets et formations</Link><Link href={`/etudiant/services/${id}`} className="text-sm text-muted hover:text-foreground">Voir la fiche étudiante</Link></div>
    {query.creation === "ok" && <p role="status" className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm"><CheckCircle2 size={18} /> Élément créé. Les personnes affectées et, si demandé, le circuit de validation ont été notifiés.</p>}
    <OpportunityReviewPanel opportunityId={id} state={reviewState} canManage={canManage} />
    <div className="grid items-start gap-5 lg:grid-cols-[1fr_340px]">
      <article className="overflow-hidden rounded-3xl border border-border bg-background"><OpportunityBanner emoji={opportunity.banner_emoji} title={opportunity.title} typeLabel={TYPE_LABEL[opportunityType(opportunity)]} status={publicationLabel} variant="admin" details={dates[0] ? <div className="grid gap-2.5"><span className="flex items-center gap-2"><CalendarDays size={17} /> {formatSessionDate(dates[0].session_date)}</span><span className="flex items-center gap-2"><Clock size={17} /> {dates[0].start_time.slice(0,5)}–{dates[0].end_time.slice(0,5)}</span>{(dates[0].location || opportunity.location) && <span className="flex items-start gap-2"><MapPin className="mt-0.5 shrink-0" size={17} /><strong className="font-medium text-white">{dates[0].location || opportunity.location}</strong></span>}</div> : undefined} /><div className="space-y-6 p-6 sm:p-8"><p className="whitespace-pre-line leading-relaxed text-muted">{opportunity.description}</p><StrategicVisionSection opportunity={opportunity} showIncomplete /><Info title="Objectifs" value={opportunity.objectives} bullets /><Info title="Intervenants" value={opportunity.speakers} inline /><Info title="Prérequis" value={opportunity.prerequisites} bullets /><Info title="Matériel des participants" value={opportunity.participant_material} bullets />
        {dates.length > 0 && <section className="mt-6 border-t border-border-soft pt-5"><h2 className="font-title text-[20px]">Dates et horaires</h2><ul className="mt-2 divide-y divide-border-soft">{dates.map((date) => <li key={date.id} className="flex items-start gap-2.5 py-3 text-sm"><CalendarDays size={17} className="mt-0.5" /><span>{formatSessionDate(date.session_date)} · {date.start_time.slice(0, 5)}–{date.end_time.slice(0, 5)}{date.location || date.room ? ` · ${[date.location, date.room].filter(Boolean).join(" · ")}` : ""}</span></li>)}</ul></section>}
      </div></article>
      <aside className="space-y-5"><section className="rounded-2xl border border-border bg-background p-5"><h2 className="font-title text-[20px]">Organisation</h2><ul className="mt-3 space-y-3 text-sm text-muted">{(opportunity.services?.name || opportunity.organizer_label) && <li><strong className="text-foreground">Service pilote :</strong> {opportunity.services?.name || opportunity.organizer_label}</li>}{opportunity.location && <li className="flex gap-2"><MapPin size={17} /> {opportunity.location}</li>}<li className="flex gap-2"><Users size={17} /> {taken} participant{taken > 1 ? "s" : ""} distinct{taken > 1 ? "s" : ""} · capacité {opportunity.capacity === null ? "illimitée" : `${opportunity.capacity} par séance`}</li></ul></section>
        <section id="inscrits" className="rounded-2xl border border-border bg-background p-5"><h2 className="font-title text-[20px]">Équipe</h2><ul className="mt-3 space-y-2 text-sm">{teamRows.map((person) => <li key={person.user_id} className="flex justify-between gap-3"><span>{person.full_name}</span><span className="text-muted">{person.responsibility === "manager" ? "Responsable" : "Contributeur"}</span></li>)}</ul>{canManage && dates.length > 0 && <details className="mt-5 border-t border-border-soft pt-4"><summary className="cursor-pointer text-sm font-medium">Inscriptions par séance ({participantRows.length} personne{participantRows.length > 1 ? "s" : ""})</summary><div className="mt-3 space-y-3">{dates.map((date) => { const people = sessionParticipantRows.filter((person) => person.opportunity_date_id === date.id); return <div key={date.id} className="rounded-xl bg-surface p-3"><p className="text-xs font-semibold">{formatSessionDate(date.session_date)} · {people.length} inscrit{people.length > 1 ? "s" : ""}</p><p className="mt-1 text-xs leading-5 text-muted">{people.length ? people.map((person) => person.full_name).join(" • ") : "Aucune inscription"}</p></div>; })}</div></details>}</section>
      </aside>
    </div>
    <OpportunityEditForms opportunity={opportunity} initialDates={dates} responsibility={responsibility} services={services} suggestedSaturdays={suggestedSaturdays} />
    <OpportunityResourcesEditor opportunityId={id} resources={resources} />
    {rights.admin && <AssignmentEditor opportunityId={id} members={members.filter((member) => !member.deactivated).map(({ id: memberId, full_name, email }) => ({ id: memberId, full_name, email }))} managers={teamRows.filter((person) => person.responsibility === "manager").map((person) => person.user_id)} contributors={teamRows.filter((person) => person.responsibility === "contributor").map((person) => person.user_id)} />}
  </div>;
}

function Info({ title, value, bullets = false, inline = false }: { title: string; value?: string | null; bullets?: boolean; inline?: boolean }) {
  if (!value) return null;
  const lines = value.split("\n").map((line) => line.trim()).filter(Boolean);
  return <section className="mt-6 border-t border-border-soft pt-5"><h2 className="font-title text-[20px]">{title}</h2>{bullets ? <ul className="mt-2 space-y-1.5 text-sm text-muted">{lines.map((line) => <li key={line} className="flex gap-2"><span>•</span>{line}</li>)}</ul> : <p className="mt-2 text-sm leading-relaxed text-muted">{inline ? lines.join(" • ") : value}</p>}</section>;
}
