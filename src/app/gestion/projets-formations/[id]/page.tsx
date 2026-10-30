import Link from "next/link";
import { CheckCircle2, ChevronLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMembers } from "@/lib/data/admin-hub";
import { getOpportunity, getOpportunityDates, getProjectsTrainingRights, getServices } from "@/lib/data/opportunities";
import OpportunityEditForms from "@/components/OpportunityEditForms";
import AssignmentEditor from "@/components/admin/AssignmentEditor";
import OpportunityReviewPanel from "@/components/OpportunityReviewPanel";
import { getOpportunityReviewState } from "@/lib/data/opportunity-review";
import { getOpportunityResources } from "@/lib/data/opportunity-resources";
import OpportunityResourcesEditor from "@/components/OpportunityResourcesEditor";
import DeleteOpportunityButton from "@/components/admin/DeleteOpportunityButton";

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
  const [opportunity, dates, rights, services] = await Promise.all([
    getOpportunity(supabase, id),
    getOpportunityDates(supabase, id),
    getProjectsTrainingRights(supabase, user.id),
    getServices(supabase),
  ]);
  if (!opportunity) notFound();
  const responsibility = rights.admin ? "admin" : rights.assignments.get(id);
  if (!responsibility) redirect("/gestion/projets-formations");
  const canManage = responsibility === "admin" || responsibility === "manager" || responsibility === "contributor";
  const [{ data: team }, { data: sessionParticipants }, reviewState, resources] = await Promise.all([
    supabase.rpc("opportunity_team", { p_opportunity: id }),
    supabase.rpc("opportunity_session_participants", { p_opp: id }),
    getOpportunityReviewState(supabase, id),
    getOpportunityResources(supabase, id),
  ]);
  const teamRows = (team ?? []) as { user_id: string; full_name: string; responsibility: "manager" | "contributor" }[];
  const sessionParticipantRows = (sessionParticipants ?? []) as { opportunity_date_id: string; user_id: string; full_name: string }[];
  const members = rights.admin ? await getMembers(supabase) : [];
  const now = new Date();
  const schoolYear = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const suggestedSaturdays = [10, 11, 0, 1, 2, 3, 4, 5].map((month) => firstSaturday(month >= 10 ? schoolYear : schoolYear + 1, month));
  const publicationLabel = opportunity.publication_status === "scheduled" ? "Publication programmée" : opportunity.publication_status === "published" ? "Publié" : opportunity.publication_status === "archived" ? "Archivé" : "Non publié";

  const editExtras = <div className="space-y-5">
    <OpportunityResourcesEditor opportunityId={id} resources={resources} />
    {rights.admin && <AssignmentEditor opportunityId={id} members={members.filter((member) => !member.deactivated).map(({ id: memberId, full_name, email }) => ({ id: memberId, full_name, email }))} managers={teamRows.filter((person) => person.responsibility === "manager").map((person) => person.user_id)} contributors={teamRows.filter((person) => person.responsibility === "contributor").map((person) => person.user_id)} />}
    <DeleteOpportunityButton opportunityId={id} title={opportunity.title} />
  </div>;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/gestion/projets-formations" className="inline-flex items-center gap-1.5 text-sm text-muted"><ChevronLeft size={16} /> Projets et formations</Link><Link href={`/etudiant/services/${id}?preview=1`} className="text-sm text-muted hover:text-foreground">Prévisualiser la fiche étudiante</Link></div>
    {query.creation === "ok" && <p role="status" className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm"><CheckCircle2 size={18} /> Élément créé et conservé dans son état de publication choisi.</p>}
    <OpportunityReviewPanel opportunityId={id} state={reviewState} canManage={canManage} />
    <OpportunityEditForms
      opportunity={opportunity}
      initialDates={dates}
      responsibility={responsibility}
      services={services}
      suggestedSaturdays={suggestedSaturdays}
      team={teamRows}
      sessionParticipants={sessionParticipantRows}
      resources={resources}
      publicationLabel={publicationLabel}
      editExtras={editExtras}
    />
  </div>;
}
