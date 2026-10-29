import Link from "next/link";
import { CalendarDays, CheckCircle2, ChevronLeft, MapPin, Users } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMembers } from "@/lib/data/admin-hub";
import { getOpportunity, getOpportunityCounts, getOpportunityDates, getProjectsTrainingRights, getServices, opportunityType, TYPE_LABEL } from "@/lib/data/opportunities";
import { formatSessionDate } from "@/lib/format";
import OpportunityEditForms from "@/components/OpportunityEditForms";
import AssignmentEditor from "@/components/admin/AssignmentEditor";

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
  const [{ data: team }, { data: participants }] = await Promise.all([
    supabase.rpc("opportunity_team", { p_opportunity: id }),
    supabase.rpc("opportunity_participants", { p_opp: id }),
  ]);
  const teamRows = (team ?? []) as { user_id: string; full_name: string; responsibility: "manager" | "contributor" }[];
  const participantRows = (participants ?? []) as { full_name: string }[];
  const members = rights.admin ? await getMembers(supabase) : [];
  const taken = counts.get(id) ?? participantRows.length;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/gestion/projets-formations" className="inline-flex items-center gap-1.5 text-sm text-muted"><ChevronLeft size={16} /> Projets et formations</Link><Link href={`/etudiant/services/${id}`} className="text-sm text-muted hover:text-foreground">Voir la fiche étudiante</Link></div>
    {query.creation === "ok" && <p role="status" className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm"><CheckCircle2 size={18} /> Élément créé. Aucune notification n’a été envoyée.</p>}
    <div className="grid items-start gap-5 lg:grid-cols-[1fr_340px]">
      <article className="rounded-2xl border border-border bg-background p-6 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><span className="rounded-full bg-surface px-3 py-1 text-xs font-medium">{TYPE_LABEL[opportunityType(opportunity)]}</span><span className="text-xs text-muted">{opportunity.publication_status === "scheduled" ? "Publication programmée" : opportunity.publication_status === "published" ? "Publié" : opportunity.publication_status === "archived" ? "Archivé" : "Non publié"}</span></div><h1 className="font-title mt-5 text-[30px]">{opportunity.title}</h1><p className="mt-4 whitespace-pre-line leading-relaxed text-muted">{opportunity.description}</p><Info title="Objectifs" value={opportunity.objectives} /><Info title="Intervenants" value={opportunity.speakers} /><Info title="Prérequis" value={opportunity.prerequisites} /><Info title="Matériel d’organisation" value={opportunity.organization_material} /><Info title="Matériel des participants" value={opportunity.participant_material} />
        {dates.length > 0 && <section className="mt-6 border-t border-border-soft pt-5"><h2 className="font-title text-[20px]">Dates et horaires</h2><ul className="mt-2 divide-y divide-border-soft">{dates.map((date) => <li key={date.id} className="flex items-start gap-2.5 py-3 text-sm"><CalendarDays size={17} className="mt-0.5" /><span>{formatSessionDate(date.session_date)} · {date.start_time.slice(0, 5)}–{date.end_time.slice(0, 5)}{date.location || date.room ? ` · ${[date.location, date.room].filter(Boolean).join(" · ")}` : ""}</span></li>)}</ul></section>}
      </article>
      <aside className="space-y-5"><section className="rounded-2xl border border-border bg-background p-5"><h2 className="font-title text-[20px]">Organisation</h2><ul className="mt-3 space-y-3 text-sm text-muted">{(opportunity.services?.name || opportunity.organizer_label) && <li><strong className="text-foreground">Service pilote :</strong> {opportunity.services?.name || opportunity.organizer_label}</li>}{opportunity.location && <li className="flex gap-2"><MapPin size={17} /> {opportunity.location}</li>}<li className="flex gap-2"><Users size={17} /> {taken} inscrit{taken > 1 ? "s" : ""}{opportunity.capacity === null ? " · capacité illimitée" : ` · ${Math.max(0, opportunity.capacity - taken)} place(s) restante(s)`}</li></ul></section>
        <section id="inscrits" className="rounded-2xl border border-border bg-background p-5"><h2 className="font-title text-[20px]">Équipe</h2><ul className="mt-3 space-y-2 text-sm">{teamRows.map((person) => <li key={person.user_id} className="flex justify-between gap-3"><span>{person.full_name}</span><span className="text-muted">{person.responsibility === "manager" ? "Responsable" : "Contributeur"}</span></li>)}</ul>{canManage && participantRows.length > 0 && <details className="mt-5 border-t border-border-soft pt-4"><summary className="cursor-pointer text-sm font-medium">Voir les inscrits ({participantRows.length})</summary><ul className="mt-2 space-y-1 text-sm text-muted">{participantRows.map((person, index) => <li key={`${person.full_name}-${index}`}>{person.full_name}</li>)}</ul></details>}</section>
      </aside>
    </div>
    <OpportunityEditForms opportunity={opportunity} initialDates={dates} responsibility={responsibility} services={services} />
    {rights.admin && <AssignmentEditor opportunityId={id} members={members.filter((member) => !member.deactivated).map(({ id: memberId, full_name, email }) => ({ id: memberId, full_name, email }))} managers={teamRows.filter((person) => person.responsibility === "manager").map((person) => person.user_id)} contributors={teamRows.filter((person) => person.responsibility === "contributor").map((person) => person.user_id)} />}
  </div>;
}

function Info({ title, value }: { title: string; value?: string | null }) {
  if (!value) return null;
  return <section className="mt-6 border-t border-border-soft pt-5"><h2 className="font-title text-[20px]">{title}</h2><p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">{value}</p></section>;
}
