import Link from "next/link";
import { CalendarDays, ChevronRight, MapPin, Plus, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOpportunities, getOpportunityCounts, getOpportunityDates, getProjectsTrainingRights, opportunityType, TYPE_LABEL } from "@/lib/data/opportunities";
import { formatSessionDate } from "@/lib/format";

export default async function ProjectsTrainingManagementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/connexion");
  const [rights, rows, counts] = await Promise.all([
    getProjectsTrainingRights(supabase, user.id),
    getOpportunities(supabase),
    getOpportunityCounts(supabase),
  ]);
  if (!rights.admin && !rights.member) redirect("/etudiant");
  const mine = rights.admin ? rows : rows.filter((row) => rights.assignments.has(row.id));
  const withDates = await Promise.all(mine.map(async (row) => ({ row, dates: await getOpportunityDates(supabase, row.id) })));

  return <div className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="label text-xs tracking-[.18em] text-muted">GESTION</p><h1 className="font-title mt-2 text-[30px]">Projets et formations</h1><p className="mt-1 text-sm text-muted">{rights.admin ? "Tous les éléments de la plateforme." : "Uniquement les éléments auxquels vous êtes affecté."}</p></div>{rights.admin && <Link href="/gestion/projets-formations/nouveau" className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-medium text-on-accent"><Plus size={17} /> Créer un élément</Link>}</header>
    {withDates.length ? <ul className="grid gap-4 lg:grid-cols-2">{withDates.map(({ row, dates }) => {
      const taken = counts.get(row.id) ?? 0;
      const responsibility = rights.admin ? "Administrateur" : rights.assignments.get(row.id) === "manager" ? "Responsable" : "Contributeur";
      return <li key={row.id}><Link href={`/gestion/projets-formations/${row.id}`} className="flex h-full flex-col rounded-2xl border border-border bg-background p-5 transition hover:border-foreground"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-surface px-3 py-1 text-xs font-medium">{TYPE_LABEL[opportunityType(row)]}</span><span className="text-xs text-muted">{responsibility}</span></div><h2 className="font-title mt-4 text-[22px]">{row.title}</h2><p className="mt-2 line-clamp-2 text-sm text-muted">{row.short_description || row.description}</p><ul className="mt-auto space-y-2 pt-5 text-sm text-muted">{dates[0] && <li className="flex gap-2"><CalendarDays size={16} /> {formatSessionDate(dates[0].session_date)} · {dates[0].start_time.slice(0, 5)}</li>}{row.location && <li className="flex gap-2"><MapPin size={16} /> {row.location}</li>}<li className="flex items-center justify-between"><span className="flex gap-2"><Users size={16} /> {taken} participant{taken > 1 ? "s" : ""} distinct{taken > 1 ? "s" : ""} · {dates.length} séance{dates.length > 1 ? "s" : ""}</span><ChevronRight size={16} /></li></ul></Link></li>;
    })}</ul> : <section className="rounded-2xl border border-border bg-background p-6 text-sm text-muted">Aucun projet ou formation ne vous est actuellement affecté.</section>}
  </div>;
}
