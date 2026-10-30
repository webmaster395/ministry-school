import Link from "next/link";
import { BookOpenText, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMembers } from "@/lib/data/admin-hub";
import { getOpportunity, getOpportunityDates, getOpportunityInternalMaterial, getProjectsTrainingRights, getServices } from "@/lib/data/opportunities";
import OpportunityEditForms from "@/components/OpportunityEditForms";
import AssignmentEditor from "@/components/admin/AssignmentEditor";
import OpportunityReviewPanel from "@/components/OpportunityReviewPanel";
import { getOpportunityReviewState } from "@/lib/data/opportunity-review";
import { getOpportunityResources } from "@/lib/data/opportunity-resources";
import OpportunityResourcesEditor from "@/components/OpportunityResourcesEditor";
import DeleteOpportunityButton from "@/components/admin/DeleteOpportunityButton";
import ContributorAccessEditor from "@/components/gestion/ContributorAccessEditor";
import ArchiveOpportunityRequest from "@/components/gestion/ArchiveOpportunityRequest";
import { getViewer } from "@/lib/data/viewer";
import CourseCreationDialog from "@/components/gestion/CourseCreationDialog";
import { formatSessionDate } from "@/lib/format";

function firstSaturday(year: number, month: number) {
  const date = new Date(Date.UTC(year, month, 1));
  date.setUTCDate(1 + ((6 - date.getUTCDay() + 7) % 7));
  return date.toISOString().slice(0, 10);
}

export default async function ProjectsTrainingManageDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ creation?: string; scope?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/connexion");
  const [opportunity, dates, rights, services, { data: canManageInternalMaterial }, viewer] = await Promise.all([
    getOpportunity(supabase, id),
    getOpportunityDates(supabase, id),
    getProjectsTrainingRights(supabase, user.id),
    getServices(supabase),
    supabase.rpc("can_review_editorial_content"),
    getViewer(),
  ]);
  if (!opportunity) notFound();
  const globalScope = !!viewer?.roles.admin && ["admin", "super"].includes(query.scope ?? "");
  const responsibility = globalScope ? (viewer?.roles.superAdmin ? "admin" : "readonly") : rights.assignments.get(id);
  if (!responsibility) redirect("/gestion/projets-formations");
  const canManage = responsibility === "admin" || responsibility === "manager";
  const canEdit = canManage || rights.editableAssignments.has(id);
  const [{ data: team }, { data: sessionParticipants }, { data: courseRows }, reviewState, resources] = await Promise.all([
    supabase.rpc("opportunity_team", { p_opportunity: id }),
    supabase.rpc("opportunity_session_participants", { p_opp: id }),
    supabase.from("sessions").select("id,description,session_date,start_time,end_time,editorial_status,is_draft").eq("opportunity_id", id).order("session_date"),
    getOpportunityReviewState(supabase, id),
    getOpportunityResources(supabase, id),
  ]);
  const teamRows = (team ?? []) as { user_id: string; full_name: string; responsibility: "manager" | "contributor"; can_edit: boolean }[];
  const sessionParticipantRows = (sessionParticipants ?? []) as { opportunity_date_id: string; user_id: string; full_name: string }[];
  const members = rights.admin ? await getMembers(supabase) : [];
  const internalMaterial = canManageInternalMaterial ? await getOpportunityInternalMaterial(supabase, id) : null;
  const opportunityWithPrivatePlanning = { ...opportunity, organization_material: internalMaterial };
  const now = new Date();
  const schoolYear = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const suggestedSaturdays = [10, 11, 0, 1, 2, 3, 4, 5].map((month) => firstSaturday(month >= 10 ? schoolYear : schoolYear + 1, month));
  const publicationLabel = opportunity.publication_status === "scheduled" ? "Publication programmée" : opportunity.publication_status === "published" ? "Publié" : opportunity.publication_status === "archived" ? "Archivé" : "Non publié";
  const linkedCourses = (courseRows ?? []) as { id: string; description: string | null; session_date: string; start_time: string; end_time: string; editorial_status: string | null; is_draft: boolean | null }[];

  const editExtras = <div className="space-y-5">
    {canEdit && <OpportunityResourcesEditor opportunityId={id} resources={resources} />}
    {responsibility === "admin" && <AssignmentEditor opportunityId={id} members={members.filter((member) => !member.deactivated).map(({ id: memberId, full_name, email }) => ({ id: memberId, full_name, email }))} managers={teamRows.filter((person) => person.responsibility === "manager").map((person) => person.user_id)} contributors={teamRows.filter((person) => person.responsibility === "contributor").map((person) => person.user_id)} />}
    {responsibility === "manager" && <section className="rounded-3xl border border-border bg-background p-5 sm:p-6"><h2 className="font-title text-xl">Accès des contributeurs</h2><p className="mb-4 mt-1 text-sm text-muted">Les affectations sont gérées par la Super administration. Vous pouvez uniquement choisir le niveau d’accès des personnes déjà affectées.</p><ContributorAccessEditor opportunityId={id} contributors={teamRows.filter((person) => person.responsibility === "contributor")} /></section>}
    {responsibility === "admin" ? <DeleteOpportunityButton opportunityId={id} title={opportunity.title} /> : responsibility === "manager" ? <ArchiveOpportunityRequest opportunityId={id} requested={!!opportunity.archive_requested_at} /> : null}
  </div>;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href={globalScope ? "/gestion/projets-formations?scope=admin" : "/gestion/projets-formations"} className="inline-flex items-center gap-1.5 text-sm text-muted"><ChevronLeft size={16} /> Projets et formations</Link><Link href={`/etudiant/services/${id}?preview=1`} className="text-sm text-muted hover:text-foreground">Prévisualiser la fiche étudiante</Link></div>
    {query.creation === "ok" && <p role="status" className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm"><CheckCircle2 size={18} /> Élément créé et conservé dans son état de publication choisi.</p>}
    {responsibility !== "readonly" && <OpportunityReviewPanel opportunityId={id} state={reviewState} canManage={canManage} />}
    <LinkedCourses
      opportunityId={id}
      title={opportunity.title}
      courses={linkedCourses}
      canCreate={canManage}
      defaultDate={dates[0]?.session_date ?? ""}
      defaultLocation={dates[0]?.location ?? opportunity.location ?? ""}
    />
    <OpportunityEditForms
      opportunity={opportunityWithPrivatePlanning}
      initialDates={dates}
      canEdit={canEdit}
      canManage={canManage}
      services={services}
      suggestedSaturdays={suggestedSaturdays}
      team={teamRows}
      sessionParticipants={sessionParticipantRows}
      resources={resources}
      publicationLabel={publicationLabel}
      canManageInternalMaterial={!!canManageInternalMaterial}
      editExtras={editExtras}
    />
  </div>;
}

const COURSE_STATUS: Record<string, string> = {
  draft: "Brouillon",
  pending: "En attente de validation",
  changes_requested: "À corriger",
  scheduled: "Publication programmée",
  published: "Publié",
  superseded: "Version remplacée",
};

function LinkedCourses({ opportunityId, title, courses, canCreate, defaultDate, defaultLocation }: {
  opportunityId: string;
  title: string;
  courses: { id: string; description: string | null; session_date: string; start_time: string; end_time: string; editorial_status: string | null; is_draft: boolean | null }[];
  canCreate: boolean;
  defaultDate: string;
  defaultLocation: string;
}) {
  return <section className="rounded-3xl border border-border bg-background p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-[.12em] text-muted">Parcours pédagogique</p><h2 className="font-title mt-1 text-[24px] text-foreground">Cours associés</h2><p className="mt-1 text-sm text-muted">Créez et préparez les cours de cette initiative depuis la même fiche que les autres formations.</p></div>
      {canCreate && <CourseCreationDialog context="opportunity" parentId={opportunityId} parentLabel={title} defaultDate={defaultDate} defaultLocation={defaultLocation} triggerLabel="+ Créer un cours" />}
    </div>
    {courses.length ? <ul className="mt-5 divide-y divide-border-soft border-y border-border-soft">{courses.map((course) => <li key={course.id}>
      <Link href={`/gestion/projets-formations/${opportunityId}/cours/${course.id}`} className="group grid gap-3 py-4 transition sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
        <span className="flex min-w-0 items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-muted"><BookOpenText size={18} /></span><span className="min-w-0"><strong className="block truncate text-[15px] text-foreground group-hover:text-link">{course.description || "Cours sans titre"}</strong><span className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted"><CalendarDays size={14} /> {formatSessionDate(course.session_date)} · {course.start_time.slice(0,5).replace(":"," h ")}–{course.end_time.slice(0,5).replace(":"," h ")}</span></span></span>
        <span className="w-fit rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-muted">{COURSE_STATUS[course.editorial_status ?? "draft"] ?? (course.is_draft ? "Brouillon" : "Prêt")}</span>
        <ChevronRight size={17} className="hidden text-muted sm:block" />
      </Link>
    </li>)}</ul> : <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface/40 px-5 py-8 text-center"><BookOpenText size={24} className="mx-auto text-muted" /><p className="mt-3 font-semibold text-foreground">Aucun cours associé</p><p className="mt-1 text-sm text-muted">Le premier cours reprendra automatiquement cette initiative comme contexte.</p>{canCreate && <div className="mt-4"><CourseCreationDialog context="opportunity" parentId={opportunityId} parentLabel={title} defaultDate={defaultDate} defaultLocation={defaultLocation} triggerLabel="Créer le premier cours" /></div>}</div>}
  </section>;
}
