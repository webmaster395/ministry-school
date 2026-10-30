import Link from "next/link";
import { CalendarDays, ChevronRight, MapPin, Plus, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOpportunities, getOpportunityCounts, getOpportunityDates, getProjectsTrainingRights, isPublished, opportunityType, TYPE_LABEL, type Opportunity } from "@/lib/data/opportunities";
import { formatSessionDate } from "@/lib/format";
import OpportunityBanner from "@/components/OpportunityBanner";
import { getOpportunityReviewState, type OpportunityReviewState } from "@/lib/data/opportunity-review";
import { plainTextContent } from "@/components/FormattedContent";
import { getViewer } from "@/lib/data/viewer";

type StatusKey = "all" | "draft" | "pending" | "published" | "past";

function workflowStatus(row: Opportunity, dates: { session_date: string }[], review: OpportunityReviewState, today: string) {
  if (row.publication_status === "archived") return { key: "past" as const, label: "Archivé" };
  if (isPublished(row) && dates.length > 0 && dates.every((date) => date.session_date < today)) return { key: "past" as const, label: "Passé" };
  if (review.status === "pending") return { key: "pending" as const, label: "Soumis à validation" };
  if (review.status === "changes_requested") return { key: "pending" as const, label: "À corriger" };
  if (row.publication_status === "scheduled") return { key: "published" as const, label: "Publication programmée" };
  if (isPublished(row)) return { key: "published" as const, label: "Publié" };
  return { key: "draft" as const, label: "Brouillon" };
}

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
  if (!globalScope && !rights.admin && !rights.member) redirect("/etudiant");
  const mine = globalScope ? rows : rows.filter((row) => rights.assignments.has(row.id));
  const requested = query.statut;
  const filter: StatusKey = (["draft", "pending", "published", "past"] as string[]).includes(requested ?? "") ? requested as StatusKey : "all";
  const today = new Date().toISOString().slice(0, 10);
  const withDates = await Promise.all(mine.map(async (row) => {
    const [dates, review] = await Promise.all([getOpportunityDates(supabase, row.id), getOpportunityReviewState(supabase, row.id)]);
    return { row, dates, review, workflow: workflowStatus(row, dates, review, today) };
  }));
  const shown = filter === "all" ? withDates : withDates.filter((item) => item.workflow.key === filter);

  return <div className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="label text-xs tracking-[.18em] text-muted">{globalScope ? "ADMINISTRATION" : "GESTION"}</p><h1 className="font-title mt-2 text-[30px]">Projets et formations</h1><p className="mt-1 text-sm text-muted">{globalScope ? "Vue globale. Les actions dépendent de votre niveau d’accès." : "Uniquement les éléments auxquels vous êtes affecté."}</p></div>{rights.canCreate && (!globalScope || viewer?.roles.superAdmin) && <Link href={`/gestion/projets-formations/nouveau${globalScope ? "?scope=admin" : ""}`} className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-medium text-on-accent"><Plus size={17} /> Créer un élément</Link>}</header>
    <nav className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-background p-1.5 sm:grid-cols-5">{[
      ["all", "Tous"], ["draft", "Brouillons"], ["pending", "Soumis"], ["published", "Publiés"], ["past", "Passés"],
    ].map(([key, label]) => { const params = new URLSearchParams(); if (key !== "all") params.set("statut", key); if (globalScope) params.set("scope", "admin"); const suffix = params.toString(); return <Link key={key} href={`/gestion/projets-formations${suffix ? `?${suffix}` : ""}`} className={`rounded-xl px-3 py-2.5 text-center text-sm font-medium ${filter === key ? "bg-accent text-on-accent" : "text-muted hover:bg-surface hover:text-foreground"}`}>{label}</Link>; })}</nav>
    {shown.length ? <ul className="grid gap-4 lg:grid-cols-2">{shown.map(({ row, dates, workflow }) => {
      const taken = counts.get(row.id) ?? 0;
      const responsibility = globalScope ? (viewer?.roles.superAdmin ? "Super admin" : "Consultation Admin") : rights.assignments.get(row.id) === "manager" ? "Responsable" : "Contributeur";
      return <li key={row.id}><Link href={`/gestion/projets-formations/${row.id}${globalScope ? "?scope=admin" : ""}`} className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-background transition hover:border-foreground"><OpportunityBanner emoji={row.banner_emoji} title={row.title} typeLabel={TYPE_LABEL[opportunityType(row)]} status={workflow.label} variant="card" /><div className="flex flex-1 flex-col p-5"><div className="mb-3 flex items-center justify-between gap-3"><span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-foreground">{workflow.label}</span><span className="text-xs text-muted">{responsibility}</span></div><p className="line-clamp-2 text-sm text-muted">{plainTextContent(row.short_description || row.description)}</p><ul className="mt-auto space-y-2 pt-5 text-sm text-muted">{dates[0] && <li className="flex gap-2"><CalendarDays size={16} /> {formatSessionDate(dates[0].session_date)} · {dates[0].start_time.slice(0, 5)}</li>}{row.location && <li className="flex gap-2"><MapPin size={16} /> {row.location}</li>}<li className="flex items-center justify-between"><span className="flex gap-2"><Users size={16} /> {taken} participant{taken > 1 ? "s" : ""} distinct{taken > 1 ? "s" : ""} · {dates.length} séance{dates.length > 1 ? "s" : ""}</span><ChevronRight size={16} /></li></ul></div></Link></li>;
    })}</ul> : <section className="rounded-2xl border border-border bg-background p-6 text-sm text-muted">Aucun projet ou formation dans ce statut.</section>}
  </div>;
}
