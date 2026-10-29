import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, ChevronRight, FolderKanban, GraduationCap } from "lucide-react";
import { getViewer } from "@/lib/data/viewer";
import { createClient } from "@/lib/supabase/server";
import { getValidationQueue, type ValidationQueueItem } from "@/lib/data/ministry-course-review";
import MinistryPicto from "@/components/MinistryPicto";

const parisDate = (value: string) => new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris",
}).format(new Date(value));

export default async function ValidationPage({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  const viewer = await getViewer();
  if (!viewer?.roles.editorialReviewer) redirect("/etudiant");
  const tab = (await searchParams).onglet === "cours" ? "cours" : "projets";
  const queue = await getValidationQueue(await createClient());
  const rows = tab === "cours" ? queue.courses : queue.opportunities;
  return <div className="space-y-5">
    <header><p className="label text-xs tracking-[.18em] text-muted">VALIDATION ÉDITORIALE</p><h1 className="font-title mt-2 text-[32px]">À valider</h1><p className="mt-1 text-sm text-muted">Flora et Nathalie centralisent ici les rendus soumis avant leur publication.</p></header>
    <nav className="grid gap-2 rounded-2xl border border-border bg-background p-1.5 sm:grid-cols-2">
      <Tab href="/gestion/a-valider" active={tab === "projets"} icon={<FolderKanban size={18} />} label="Projets et formations" count={queue.opportunities.length} />
      <Tab href="/gestion/a-valider?onglet=cours" active={tab === "cours"} icon={<GraduationCap size={18} />} label="Cours ministériels" count={queue.courses.length} />
    </nav>
    {rows.length ? <ul className="divide-y divide-border-soft overflow-hidden rounded-2xl border border-border bg-background">{rows.map((item) => <QueueRow key={item.id} item={item} course={tab === "cours"} />)}</ul> : <section className="rounded-2xl border border-border bg-background p-8 text-center"><p className="font-title text-[21px]">Tout est à jour</p><p className="mt-1 text-sm text-muted">Aucun élément n’attend de validation dans cette catégorie.</p></section>}
  </div>;
}

function Tab({ href, active, icon, label, count }: { href: string; active: boolean; icon: React.ReactNode; label: string; count: number }) {
  return <Link href={href} className={`flex min-h-12 items-center justify-between gap-3 rounded-xl px-4 text-sm font-semibold ${active ? "bg-accent text-on-accent" : "text-muted hover:bg-surface"}`}><span className="flex items-center gap-2">{icon}{label}</span><span className={`grid h-7 min-w-7 place-items-center rounded-full px-2 text-xs ${active ? "bg-white/15" : "bg-surface text-foreground"}`}>{count}</span></Link>;
}

function QueueRow({ item, course }: { item: ValidationQueueItem; course: boolean }) {
  const href = course ? `/gestion/enseignement/preparation/${item.id}?validation=1` : `/gestion/projets-formations/${item.id}`;
  return <li><Link href={href} className="grid gap-3 px-5 py-4 transition hover:bg-surface sm:grid-cols-[1fr_auto] sm:items-center sm:px-6"><span className="min-w-0"><span className="flex flex-wrap items-center gap-2">{course && item.ministrySlug && <MinistryPicto slug={item.ministrySlug} size={17} />}<strong className="text-[16px] text-foreground">{item.title}</strong>{item.ministry && <span className="rounded-full bg-surface px-2.5 py-1 text-xs text-muted">{item.ministry}</span>}</span><span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted"><span>{item.responsible}</span><span className="inline-flex items-center gap-1.5"><CalendarClock size={14} /> Soumis le {parisDate(item.submittedAt)}</span></span></span><span className="flex items-center gap-2"><span className="rounded-full bg-[#FFF0CC] px-3 py-1.5 text-xs font-semibold text-[#78520A]">En attente</span><ChevronRight size={18} className="text-muted" /></span></Link></li>;
}
