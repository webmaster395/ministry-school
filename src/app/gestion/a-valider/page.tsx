import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, ChevronRight } from "lucide-react";
import { getViewer } from "@/lib/data/viewer";
import { createClient } from "@/lib/supabase/server";
import { getValidationQueue, type ValidationQueueItem } from "@/lib/data/ministry-course-review";
import MinistryPicto from "@/components/MinistryPicto";

const parisDate = (value: string) => new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris",
}).format(new Date(value));

type TabKey = "all" | "projects" | "training" | "courses" | "history";

export default async function ValidationPage({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  const viewer = await getViewer();
  if (!viewer?.roles.superAdmin) redirect("/etudiant");
  const requested = (await searchParams).onglet;
  const tab: TabKey = (["projects", "training", "courses", "history"] as string[]).includes(requested ?? "") ? requested as TabKey : "all";
  const queue = await getValidationQueue(await createClient());
  const pending = [...queue.opportunities, ...queue.courses];
  const rows = tab === "history" ? queue.history
    : tab === "courses" ? queue.courses
      : tab === "projects" ? queue.opportunities.filter((item) => item.contentType === "project" || item.contentType === "both")
        : tab === "training" ? queue.opportunities.filter((item) => item.contentType === "training" || item.contentType === "both")
          : pending;

  return <div className="space-y-5">
    <header>
      <p className="label text-xs tracking-[.18em] text-muted">VALIDATION ÉDITORIALE</p>
      <h1 className="font-title mt-2 text-[32px]">À valider</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">Retrouvez les contenus en attente de publication et examinez les demandes des responsables.</p>
    </header>
    <nav className="grid grid-cols-2 gap-1.5 rounded-2xl border border-border bg-background p-1.5 lg:grid-cols-5">
      <Tab href="/gestion/a-valider" active={tab === "all"} label="Tout" count={pending.length} />
      <Tab href="/gestion/a-valider?onglet=projects" active={tab === "projects"} label="Projets" count={queue.opportunities.filter((item) => item.contentType === "project" || item.contentType === "both").length} />
      <Tab href="/gestion/a-valider?onglet=training" active={tab === "training"} label="Formations" count={queue.opportunities.filter((item) => item.contentType === "training" || item.contentType === "both").length} />
      <Tab href="/gestion/a-valider?onglet=courses" active={tab === "courses"} label="Cours de ministère" count={queue.courses.length} />
      <Tab href="/gestion/a-valider?onglet=history" active={tab === "history"} label="Historique" />
    </nav>
    {rows.length ? (
      <ul className="divide-y divide-border-soft overflow-hidden rounded-2xl border border-border bg-background">
        {rows.map((item, index) => <QueueRow key={`${item.contentType}-${item.id}-${index}`} item={item} history={tab === "history"} />)}
      </ul>
    ) : (
      <section className="rounded-2xl border border-border bg-background p-8 text-center">
        <p className="font-title text-[21px]">{tab === "history" ? "Aucune décision enregistrée" : "Tout est à jour"}</p>
        <p className="mt-1 text-sm text-muted">{tab === "history" ? "L’historique apparaîtra après les premières décisions." : "Aucun élément n’attend de validation dans cette catégorie."}</p>
      </section>
    )}
  </div>;
}

function Tab({ href, active, label, count }: { href: string; active: boolean; label: string; count?: number }) {
  return <Link href={href} className={`flex min-h-11 items-center justify-between gap-2 rounded-xl px-3 text-sm font-semibold ${active ? "bg-accent text-on-accent" : "text-muted hover:bg-surface"}`}><span>{label}</span>{count !== undefined && <span className={`grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-[11px] ${active ? "bg-white/15" : "bg-surface text-foreground"}`}>{count}</span>}</Link>;
}

function QueueRow({ item, history }: { item: ValidationQueueItem; history: boolean }) {
  const course = item.contentType === "course";
  const href = course ? `/gestion/enseignement/preparation/${item.id}?validation=1` : `/gestion/projets-formations/${item.id}`;
  const typeLabel = item.contentType === "course" ? "Cours de ministère" : item.contentType === "both" ? "Projet et formation" : item.contentType === "training" ? "Formation" : "Projet";
  const statusLabel = item.status === "approved" ? "Approuvé" : item.status === "changes_requested" ? "Corrections demandées" : "En attente";
  return <li><Link href={href} className="grid gap-3 px-5 py-4 transition hover:bg-surface sm:grid-cols-[1fr_auto] sm:items-center sm:px-6"><span className="min-w-0"><span className="flex flex-wrap items-center gap-2">{course && item.ministrySlug && <MinistryPicto slug={item.ministrySlug} size={17} />}<strong className="text-[16px] text-foreground">{item.title}</strong><span className="rounded-full bg-surface px-2.5 py-1 text-xs text-muted">{typeLabel}</span>{item.ministry && <span className="rounded-full bg-surface px-2.5 py-1 text-xs text-muted">{item.ministry}</span>}</span><span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted"><span>{item.responsible}</span><span className="inline-flex items-center gap-1.5"><CalendarClock size={14} /> Soumis le {parisDate(item.submittedAt)}</span>{history && item.reviewer && <span>Décision par {item.reviewer}{item.decidedAt ? ` · ${parisDate(item.decidedAt)}` : ""}</span>}</span></span><span className="flex items-center gap-2"><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${item.status === "approved" ? "bg-emerald-100 text-emerald-800" : item.status === "changes_requested" ? "bg-rose-100 text-rose-800" : "bg-[#FFF0CC] text-[#78520A]"}`}>{statusLabel}</span><span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">{history ? "Consulter" : "Examiner"}<ChevronRight size={18} className="text-muted" /></span></span></Link></li>;
}
