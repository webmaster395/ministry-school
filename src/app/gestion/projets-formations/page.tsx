import Link from "next/link";
import { CalendarDays, ChevronRight, MapPin, Plus, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOpportunities, getOpportunityCounts, getOpportunityDates, getProjectsTrainingRights, opportunityType, TYPE_LABEL } from "@/lib/data/opportunities";
import { formatSessionDate } from "@/lib/format";
import OpportunityBanner from "@/components/OpportunityBanner";
import { getOpportunityReviewState } from "@/lib/data/opportunity-review";
import { plainTextContent } from "@/components/FormattedContent";
import { getViewer } from "@/lib/data/viewer";
import { opportunityWorkflow } from "@/lib/opportunity-workflow";
import ManagementPageHeader from "@/components/management/ManagementPageHeader";

type StatusKey = "all" | "draft" | "pending" | "published" | "past";

export default async function ProjectsTrainingManagementPage({ searchParams }: { searchParams: Promise<{ statut?: string; scope?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/connexion");
  const [rights, rows, counts, viewer] = await Promise.all([
    getProjectsTrainingRights(supabase, user.id),
    getOpportunities(supabase),
    getOpportunityCounts(supabase),
    getViewer(),
  ]);
  const query = await searchParams;
  const globalScope = !!viewer?.roles.admin && ["admin", "super"].includes(query.scope ?? "");
  if (!globalScope && !rights.member && !rights.canCreate) redirect("/etudiant");
  const mine = globalScope ? rows : rows.filter((row) => rights.assignments.has(row.id));
  const requested = query.statut;
  const filter: StatusKey = (["draft", "pending", "published", "past"] as string[]).includes(requested ?? "") ? requested as StatusKey : "all";
  const withDates = await Promise.all(mine.map(async (row) => {
    const [dates, review] = await Promise.all([getOpportunityDates(supabase, row.id), getOpportunityReviewState(supabase, row.id)]);
    const workflow = opportunityWorkflow(row, dates, review, globalScope && !!viewer?.roles.superAdmin ? "supervision" : "workspace");
    return { row, dates, review, workflow: { ...workflow, key: workflow.key === "corrections" ? "pending" as const : workflow.key === "scheduled" ? "published" as const : workflow.key === "archived" ? "past" as const : workflow.key } };
  }));
  const shown = filter === "all" ? withDates : withDates.filter((item) => item.workflow.key === filter);

  const canCreate = globalScope ? viewer?.roles.superAdmin : rights.canCreate;
  const createHref = `/gestion/projets-formations/nouveau${globalScope ? "?scope=admin" : ""}`;
  const createAction = canCreate ? <Link href={createHref} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-on-accent sm:w-auto"><Plus size={17} /> Créer un projet ou une formation</Link> : null;

  return <div className="space-y-5">
    <ManagementPageHeader
      eyebrow={globalScope ? "ADMIN" : rights.canCreate ? "ESPACE RESPONSABLE" : "ESPACE CONTRIBUTEUR"}
      title="Projets et formations"
      subtitle={globalScope ? "Supervisez les initiatives et leurs statuts de publication." : "Uniquement les éléments auxquels vous êtes affecté."}
      actions={createAction}
      mobileTitleInAppBar={globalScope}
    />
    <nav className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-background p-1.5 min-[430px]:grid-cols-3 sm:grid-cols-5">{[
      ["all", "Tous"], ["draft", "Brouillons"], ["pending", "Soumis"], ["published", "Publiés"], ["past", "Passés"],
    ].map(([key, label]) => { const params = new URLSearchParams(); if (key !== "all") params.set("statut", key); if (globalScope) params.set("scope", "admin"); const suffix = params.toString(); return <Link key={key} href={`/gestion/projets-formations${suffix ? `?${suffix}` : ""}`} className={`rounded-xl px-3 py-2.5 text-center text-sm font-medium ${filter === key ? "bg-accent text-on-accent" : "text-muted hover:bg-surface hover:text-foreground"}`}>{label}</Link>; })}</nav>
    {shown.length ? <ul className="grid gap-4 md:grid-cols-2">{shown.map(({ row, dates, workflow }) => {
      const taken = counts.get(row.id) ?? 0;
      const responsibility = globalScope ? (viewer?.roles.superAdmin ? "Super admin" : "Consultation Admin") : rights.assignments.get(row.id) === "manager" ? "Responsable" : "Contributeur";
      return <li key={row.id}><Link href={`/gestion/projets-formations/${row.id}${globalScope ? "?scope=admin" : ""}`} className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-background transition hover:border-foreground"><OpportunityBanner emoji={row.banner_emoji} title={row.title} typeLabel={TYPE_LABEL[opportunityType(row)]} status={workflow.label} variant="card" /><div className="flex flex-1 flex-col p-5"><div className="mb-3 flex items-center justify-between gap-3"><span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-foreground">{workflow.label}</span><span className="text-xs text-muted">{responsibility}</span></div><p className="line-clamp-2 text-sm text-muted">{plainTextContent(row.short_description || row.description)}</p><ul className="mt-auto space-y-2 pt-5 text-sm text-muted">{dates[0] && <li className="flex gap-2"><CalendarDays size={16} /> {formatSessionDate(dates[0].session_date)} · {dates[0].start_time.slice(0, 5)}</li>}{row.location && <li className="flex gap-2"><MapPin size={16} /> {row.location}</li>}<li className="flex items-center justify-between"><span className="flex gap-2"><Users size={16} /> {taken} participant{taken > 1 ? "s" : ""} distinct{taken > 1 ? "s" : ""} · {dates.length} séance{dates.length > 1 ? "s" : ""}</span><ChevronRight size={16} /></li></ul></div></Link></li>;
    })}</ul> : <section className="rounded-2xl border border-border bg-background px-5 py-8 text-center sm:p-10"><h2 className="font-title text-[22px] text-foreground">{filter === "all" ? "Aucun projet pour le moment" : "Aucun élément dans ce statut"}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">{filter === "all" && canCreate ? "Crée ton premier projet ou ta première formation." : "Les initiatives correspondantes apparaîtront ici."}</p>{filter === "all" && canCreate && <div className="mx-auto mt-5 max-w-sm">{createAction}</div>}</section>}
  </div>;
}
