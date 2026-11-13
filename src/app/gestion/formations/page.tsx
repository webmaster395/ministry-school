import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, ChevronRight, Plus, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";
import { getProgramEntries, type ProgramEntry } from "@/lib/data/admin-hub";
import ManagementPageHeader from "@/components/management/ManagementPageHeader";
import ProgramTab from "@/components/admin/ProgramTab";
import DeepeningAccessManager from "@/components/formations/DeepeningAccessManager";
import { createDeepeningFormation } from "./actions";

type FormationRow = {
  id: string;
  category_key: "heart" | "character" | "sensitivity" | "deepening";
  slug: string;
  title: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  ministry: { name: string } | null;
};

const tabs = [
  { key: "upcoming", query: "prochaines", label: "Prochaines formations" },
  { key: "heart", query: "coeur", label: "Formation du cœur" },
  { key: "character", query: "caractere", label: "Formation du caractère" },
  { key: "deepening", query: "approfondissements", label: "Formations d’approfondissement" },
] as const;

export default async function FormationsPage({ searchParams }: { searchParams: Promise<{ onglet?: string; mois?: string }> }) {
  const [viewer, query] = await Promise.all([getViewer(), searchParams]);
  if (!viewer) redirect("/login");
  const allowed = viewer.roles.superAdmin ? tabs : tabs.filter((tab) => tab.key === "upcoming" || viewer.roles.formationCategoryKeys.includes(tab.key));
  if (!allowed.length) redirect("/etudiant");
  const selected = allowed.find((tab) => tab.query === query.onglet) ?? allowed[0];
  const supabase = await createClient();
  const [formationsResult, trainersResult, ministriesResult, entries, managedIdsResult, studentsResult, accessResult, assignedFormationsResult] = await Promise.all([
    supabase.from("formations").select("id,category_key,slug,title,description,status,ministry:ministries(name)").order("title"),
    supabase.from("trainers").select("id,first_name,last_name").eq("is_active", true).order("last_name"),
    supabase.from("ministries").select("id,name").order("name"),
    getProgramEntries(supabase, []),
    viewer.roles.superAdmin ? Promise.resolve({ data: null }) : supabase.rpc("managed_formation_session_ids"),
    selected.key === "deepening" && viewer.roles.superAdmin
      ? supabase.from("profiles").select("id,full_name").eq("role", "student").eq("is_test_account", false).eq("deactivated", false).order("full_name")
      : Promise.resolve({ data: [] }),
    selected.key === "deepening" && viewer.roles.superAdmin
      ? supabase.from("deepening_access").select("user_id,enabled")
      : Promise.resolve({ data: [] }),
    viewer.roles.superAdmin
      ? Promise.resolve({ data: [] })
      : supabase.from("formation_assignments").select("formation_id").eq("user_id", viewer.id),
  ]);
  const allFormationRows = (formationsResult.data ?? []) as unknown as FormationRow[];
  const allFormations = selected.key === "upcoming" ? allFormationRows : allFormationRows.filter((formation) => formation.category_key === selected.key);
  const trainers = (trainersResult.data ?? []).map((item) => ({ id: item.id, name: `${item.first_name} ${item.last_name}`.trim() }));
  const ministries = (ministriesResult.data ?? []).map((item) => ({ id: item.id, name: item.name }));
  const managedIds = new Set(((managedIdsResult.data ?? []) as unknown[]).map((item) => typeof item === "string" ? item : String((item as { managed_formation_session_ids?: string }).managed_formation_session_ids ?? "")));
  const today = new Date().toISOString().slice(0, 10);
  const formationEntries = entries.filter((entry) => entry.kind === "course"
    && (selected.key === "upcoming" ? entry.date >= today : entry.formationCategory === selected.key)
    && (viewer.roles.superAdmin || managedIds.has(entry.key.slice(2))))
    .map((entry) => ({ ...entry, href: `/gestion/enseignement/preparation/${entry.key.slice(2)}` }));
  const visibleFormationIds = new Set([
    ...formationEntries.map((entry) => entry.formationId).filter(Boolean),
    ...((assignedFormationsResult.data ?? []) as { formation_id: string }[]).map((row) => row.formation_id),
  ]);
  const formations = viewer.roles.superAdmin ? allFormations : allFormations.filter((formation) => visibleFormationIds.has(formation.id));
  const authorizedIds = new Set(((accessResult.data ?? []) as { user_id: string; enabled: boolean }[]).filter((row) => row.enabled).map((row) => row.user_id));
  const deepeningStudents = ((studentsResult.data ?? []) as { id: string; full_name: string }[]).map((student) => ({ ...student, authorized: authorizedIds.has(student.id) }));

  return <div className="space-y-6">
    <ManagementPageHeader eyebrow="MES ESPACES ADMIN" title="Formations" subtitle="Cours, séances, ressources, devoirs et responsabilités dans une seule organisation." mobileTitleInAppBar />
    {allowed.length > 1 && <nav aria-label="Catégories de formation" className="flex gap-1 overflow-x-auto rounded-2xl border border-border bg-background p-1.5 [scrollbar-width:none]">{allowed.map((tab) => <Link key={tab.key} href={`/gestion/formations?onglet=${tab.query}`} aria-current={tab.key === selected.key ? "page" : undefined} className={`shrink-0 rounded-xl px-4 py-3 text-sm font-semibold ${tab.key === selected.key ? "bg-accent text-on-accent" : "text-muted hover:bg-surface hover:text-foreground"}`}>{tab.label}</Link>)}</nav>}
    {selected.key === "upcoming"
      ? <UpcomingPanel entries={formationEntries} />
      : selected.key === "deepening"
      ? <DeepeningPanel formations={formations} entries={formationEntries} canCreate={viewer.roles.superAdmin} students={deepeningStudents} />
      : <StandardPanel formations={formations} entries={formationEntries} month={query.mois} trainers={trainers} ministries={ministries} tabQuery={selected.query} />}
  </div>;
}

function UpcomingPanel({ entries }: { entries: ProgramEntry[] }) {
  const first = entries.slice().sort((a, b) => a.date.localeCompare(b.date))[0];
  if (!first) return <Empty title="Aucune prochaine formation" text="Aucun cours futur n’est actuellement planifié dans votre périmètre." />;
  const month = first.date.slice(0, 7);
  const visible = entries.filter((entry) => entry.date.startsWith(month)).sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(`${month}-01T12:00:00`));
  return <section className="rounded-2xl border border-border bg-background p-4 sm:p-6">
    <div className="flex flex-col gap-2 border-b border-border-soft pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="label text-[10px] tracking-[.14em] text-muted">PROCHAIN CYCLE</p><h2 className="font-title mt-1 text-[28px] capitalize">{monthLabel}</h2><p className="mt-1 text-sm text-muted">Ouvrez un cours pour consulter ses informations, le modifier et enregistrer immédiatement.</p></div><span className="rounded-full bg-surface px-3 py-1.5 text-xs font-semibold">{visible.length} cours</span></div>
    <div className="mt-4 grid gap-3">{visible.map((entry) => <Link key={entry.key} href={entry.href} className="group grid gap-2 rounded-2xl border border-border p-4 transition hover:border-foreground hover:shadow-sm sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-center"><div><strong className="block text-sm capitalize">{new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${entry.date}T12:00:00`))}</strong><span className="text-xs text-muted">{entry.start.slice(0, 5)}–{entry.end.slice(0, 5)}</span></div><div className="min-w-0"><strong className="block truncate text-sm">{entry.title}</strong><span className="text-xs text-muted">{entry.track ?? "Formation"}{entry.location ? ` · ${entry.location}` : ""}</span></div><span className="inline-flex items-center gap-1 text-xs font-semibold">Ouvrir <ChevronRight size={15} className="transition group-hover:translate-x-1" /></span></Link>)}</div>
  </section>;
}

function StandardPanel({ formations, entries, month, trainers, ministries, tabQuery }: { formations: FormationRow[]; entries: ProgramEntry[]; month?: string; trainers: { id: string; name: string }[]; ministries: { id: string; name: string }[]; tabQuery: string }) {
  if (!formations.length) return <Empty title="Aucune formation rattachée" text="Aucun cours n’a été créé ou attribué à votre périmètre." />;
  return <div className="space-y-6">{formations.map((formation) => {
    const scoped = entries.filter((entry) => entry.formationId === formation.id);
    return <section key={formation.id} className="rounded-2xl border border-border bg-background p-4 sm:p-6">
      <ProgramTab entries={scoped} month={month} today={new Date().toISOString().slice(0, 10)} trainers={trainers} ministries={ministries} basePath={`/gestion/formations?onglet=${tabQuery}`} title={formation.title} subtitle={formation.description ?? `${scoped.length} cours rattachés explicitement à cette formation.`} creationContext="formation" creationParentId={formation.id} />
    </section>;
  })}</div>;
}

function DeepeningPanel({ formations, entries, canCreate, students }: { formations: FormationRow[]; entries: ProgramEntry[]; canCreate: boolean; students: { id: string; full_name: string; authorized: boolean }[] }) {
  return <div className="space-y-5">
    {canCreate && <DeepeningAccessManager students={students} />}
    {canCreate && <details className="rounded-2xl border border-border bg-background p-4 sm:p-5"><summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold"><Plus size={17} /> Créer un approfondissement</summary><form action={createDeepeningFormation} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.5fr_auto]"><input name="title" required placeholder="Titre de l’approfondissement" className="min-h-11 rounded-xl border border-border bg-background px-3.5 text-sm" /><input name="description" placeholder="Description courte" className="min-h-11 rounded-xl border border-border bg-background px-3.5 text-sm" /><button className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent">Créer le brouillon</button></form></details>}
    {formations.length ? <div className="grid gap-4 lg:grid-cols-2">{formations.map((formation) => {
      const sessions = entries.filter((entry) => entry.formationId === formation.id);
      const next = sessions.find((entry) => entry.date >= new Date().toISOString().slice(0, 10));
      return <Link key={formation.id} href={`/gestion/formations/${formation.id}`} className="group rounded-2xl border border-border bg-background p-5 transition hover:-translate-y-0.5 hover:shadow-lg"><div className="flex items-start justify-between gap-4"><div><span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted">{formation.status === "published" ? "Publié" : formation.status === "draft" ? "Brouillon" : "Archivé"}</span><h2 className="font-title mt-3 text-[24px] leading-tight text-foreground">{formation.title}</h2></div><ChevronRight className="mt-1 text-muted transition group-hover:translate-x-1" /></div><p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{formation.description ?? "Approfondissement du dimanche"}</p><div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-surface p-3 text-sm"><span className="inline-flex items-center gap-2"><CalendarDays size={16} /> {sessions.length} séance{sessions.length > 1 ? "s" : ""}</span><span className="inline-flex items-center gap-2"><UsersRound size={16} /> Inscriptions et présences</span></div>{next && <p className="mt-3 text-xs text-muted">Prochaine séance · {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${next.date}T12:00:00`))}</p>}</Link>;
    })}</div> : <Empty title="Aucun approfondissement" text="Créez le premier approfondissement sans préremplir de contenu d’exemple." />}
  </div>;
}

function Empty({ title, text }: { title: string; text: string }) {
  return <section className="rounded-2xl border border-dashed border-border bg-background px-5 py-12 text-center"><h2 className="font-title text-xl text-foreground">{title}</h2><p className="mx-auto mt-2 max-w-xl text-sm text-muted">{text}</p></section>;
}
