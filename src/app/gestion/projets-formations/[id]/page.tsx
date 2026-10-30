import Link from "next/link";
import { CheckCircle2, ChevronLeft, Download, PackageOpen } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMembers } from "@/lib/data/admin-hub";
import { getOpportunity, getOpportunityDates, getOpportunityInternalMaterial, getOpportunityManagementRevision, getProjectsTrainingRights, getServices, mergeOpportunityManagementRevision } from "@/lib/data/opportunities";
import OpportunityEditForms from "@/components/OpportunityEditForms";
import AssignmentEditor from "@/components/admin/AssignmentEditor";
import OpportunityReviewPanel from "@/components/OpportunityReviewPanel";
import { getOpportunityReviewState } from "@/lib/data/opportunity-review";
import { getOpportunityResources } from "@/lib/data/opportunity-resources";
import OpportunityResourcesEditor from "@/components/OpportunityResourcesEditor";
import DeleteOpportunityButton from "@/components/admin/DeleteOpportunityButton";
import { getViewer } from "@/lib/data/viewer";
import { getOpportunityAgenda } from "@/lib/data/opportunity-agenda";
import OpportunityAgendaEditor from "@/components/OpportunityAgendaEditor";
import { linesOf } from "@/lib/opportunity-details";
import OpportunityOperationalWorkspace from "@/components/OpportunityOperationalWorkspace";
import OpportunitySubmissionPanel from "@/components/OpportunitySubmissionPanel";
import { opportunityWorkflow } from "@/lib/opportunity-workflow";

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
  const [publicOpportunity, publicDates, rights, services, { data: canManageInternalMaterial }, viewer] = await Promise.all([
    getOpportunity(supabase, id),
    getOpportunityDates(supabase, id),
    getProjectsTrainingRights(supabase, user.id),
    getServices(supabase),
    supabase.rpc("can_review_editorial_content"),
    getViewer(),
  ]);
  if (!publicOpportunity) notFound();
  const globalScope = !!viewer?.roles.admin && ["admin", "super"].includes(query.scope ?? "");
  const responsibility = globalScope ? (viewer?.roles.superAdmin ? "admin" : "readonly") : rights.assignments.get(id);
  if (!responsibility) redirect("/gestion/projets-formations");
  const superAdminView = globalScope && !!viewer?.roles.superAdmin;
  const canManage = responsibility === "admin" || responsibility === "manager";
  const canEdit = canManage || rights.editableAssignments.has(id);
  const managementRevision = superAdminView || !globalScope
    ? await getOpportunityManagementRevision(supabase, id)
    : null;
  const managementView = mergeOpportunityManagementRevision(publicOpportunity, publicDates, managementRevision);
  const opportunity = managementView.opportunity;
  const dates = managementView.dates;
  const [{ data: team }, { data: sessionParticipants }, reviewState, resources, agenda] = await Promise.all([
    supabase.rpc("opportunity_team", { p_opportunity: id }),
    supabase.rpc("opportunity_session_participants", { p_opp: id }),
    getOpportunityReviewState(supabase, id),
    getOpportunityResources(supabase, id),
    getOpportunityAgenda(supabase, id),
  ]);
  const teamRows = (team ?? []) as { user_id: string; full_name: string; responsibility: "manager" | "contributor"; can_edit: boolean }[];
  const sessionParticipantRows = (sessionParticipants ?? []) as { opportunity_date_id: string; user_id: string; full_name: string }[];
  const members = superAdminView ? await getMembers(supabase) : [];
  const maySeeInternalMaterial = superAdminView && !!canManageInternalMaterial;
  const internalMaterial = maySeeInternalMaterial ? await getOpportunityInternalMaterial(supabase, id) : null;
  const opportunityWithPrivatePlanning = { ...opportunity, organization_material: internalMaterial };
  const now = new Date();
  const schoolYear = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const suggestedSaturdays = [10, 11, 0, 1, 2, 3, 4, 5].map((month) => firstSaturday(month >= 10 ? schoolYear : schoolYear + 1, month));
  const publicationLabel = opportunity.publication_status === "scheduled" ? "Publication programmée" : opportunity.publication_status === "published" ? "Publié" : opportunity.publication_status === "archived" ? "Archivé" : "Non publié";

  const editExtras = <div className="space-y-5">
    {canEdit && <OpportunityResourcesEditor opportunityId={id} resources={resources} />}
    {superAdminView && <AssignmentEditor opportunityId={id} members={members.filter((member) => !member.deactivated).map(({ id: memberId, full_name, email }) => ({ id: memberId, full_name, email }))} managers={teamRows.filter((person) => person.responsibility === "manager").map((person) => person.user_id)} contributors={teamRows.filter((person) => person.responsibility === "contributor").map((person) => person.user_id)} />}
    {superAdminView && <DeleteOpportunityButton opportunityId={id} title={opportunity.title} />}
  </div>;
  const workflow = opportunityWorkflow(opportunity, dates, reviewState);
  const internalMaterials = linesOf(internalMaterial);
  const commonEditorProps = {
    opportunity: opportunityWithPrivatePlanning,
    initialDates: dates,
    canEdit,
    canManage,
    services,
    suggestedSaturdays,
    team: teamRows,
    sessionParticipants: sessionParticipantRows,
    resources,
    publicationLabel,
    editExtras,
  };
  const actionHref = workflow.key === "pending" ? (superAdminView ? "#validation-publication" : !globalScope ? "#suivi-validation" : null)
    : workflow.key === "corrections" ? (superAdminView ? "#validation-publication" : !globalScope ? "#suivi-validation" : null)
      : workflow.key === "scheduled" ? (superAdminView ? "#validation-publication" : !globalScope ? "#suivi-validation" : null) : null;
  const actionLabel = workflow.key === "pending" ? (superAdminView ? "À valider" : "Voir le suivi") : workflow.actionLabel;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href={globalScope ? "/gestion/projets-formations?scope=admin" : "/gestion/projets-formations"} className="inline-flex items-center gap-1.5 text-sm text-muted"><ChevronLeft size={16} /> Projets et formations</Link><div className="flex flex-wrap items-center gap-3"><span className="inline-flex items-center gap-2"><span className="text-[11px] font-semibold uppercase tracking-[.12em] text-muted">Statut</span><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${workflow.badgeClass}`}>{workflow.label}</span></span>{actionHref && actionLabel && <span className="inline-flex items-center gap-2"><span className="text-[11px] font-semibold uppercase tracking-[.12em] text-muted">Action</span><a href={actionHref} className="inline-flex min-h-9 items-center rounded-full border border-foreground px-3.5 text-xs font-semibold text-foreground transition hover:bg-foreground hover:text-background">{actionLabel}</a></span>}<Link href={`/gestion/projets-formations/${id}/pdf${globalScope ? "?scope=admin" : ""}`} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-background px-3.5 text-xs font-semibold text-foreground transition hover:border-foreground"><Download size={15} /> Télécharger le PDF</Link><Link href={`/etudiant/services/${id}?preview=1`} className="text-sm text-muted hover:text-foreground">Prévisualiser la fiche étudiante</Link></div></div>
    {query.creation === "ok" && <p role="status" className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm"><CheckCircle2 size={18} /> Élément créé en brouillon.</p>}
    {managementRevision && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"><strong>Version de travail non publiée.</strong> La fiche étudiante conserve la dernière version validée jusqu’à la prochaine approbation.</p>}
    {globalScope
      ? <OpportunityEditForms {...commonEditorProps} canManageInternalMaterial={maySeeInternalMaterial} experience="supervision" />
      : <OpportunityOperationalWorkspace {...commonEditorProps} roleLabel={responsibility === "manager" ? "Responsable" : "Contributeur"} readOnly={!canEdit} />}
    <OpportunityAgendaEditor opportunityId={id} dates={dates} initialSteps={agenda} canEdit={globalScope ? superAdminView : canEdit} experience={globalScope ? "supervision" : "workspace"} />
    {maySeeInternalMaterial && <section className="rounded-3xl border border-border bg-background p-5 sm:p-7"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-muted"><PackageOpen size={19} /></span><div><p className="label text-xs tracking-[.14em] text-muted">INFORMATION INTERNE</p><h2 className="font-title mt-1 text-[23px]">Matériel nécessaire à l’organisation</h2><p className="mt-1 text-xs leading-5 text-muted">Visible uniquement dans la vue de supervision Super admin et dans son export PDF.</p></div></div>{internalMaterials.length ? <ul className="mt-5 grid gap-2 sm:grid-cols-2">{internalMaterials.map((item) => <li key={item} className="rounded-xl bg-surface px-4 py-3 text-sm">• {item}</li>)}</ul> : <p className="mt-5 rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted">Aucun besoin matériel interne renseigné.</p>}</section>}
    {superAdminView ? <OpportunityReviewPanel opportunityId={id} state={reviewState} /> : !globalScope ? <OpportunitySubmissionPanel opportunityId={id} state={reviewState} canSubmit={responsibility === "manager"} /> : null}
  </div>;
}
