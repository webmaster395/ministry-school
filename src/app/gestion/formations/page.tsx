import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, ChevronRight, Plus, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";
import { getProgramEntries, type ProgramEntry } from "@/lib/data/admin-hub";
import ManagementPageHeader from "@/components/management/ManagementPageHeader";
import ProgramTab from "@/components/admin/ProgramTab";
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
  { key: "heart", query: "coeur", label: "Formation du cœur" },
  { key: "character", query: "caractere", label: "Formation du caractère" },
  { key: "sensitivity", query: "sensibilites", label: "Formation des sensibilités" },
  { key: "deepening", query: "approfondissements", label: "Formations d’approfondissement" },
] as const;

export default async function FormationsPage({ searchParams }: { searchParams: Promise<{ onglet?: string; mois?: string }> }) {
  const [viewer, query] = await Promise.all([getViewer(), searchParams]);
  if (!viewer) redirect("/login");
  const allowed = viewer.roles.superAdmin ? tabs : tabs.filter((tab) => viewer.roles.formationCategoryKeys.includes(tab.key));
  if (!allowed.length) redirect("/etudiant");
  const selected = allowed.find((tab) => tab.query === query.onglet) ?? allowed[0];
  const supabase = await createClient();
  const [formationsResult, trainersResult, ministriesResult, entries, managedIdsResult] = await Promise.all([
    supabase.from("formations").select("id,category_key,slug,title,description,status,ministry:ministries(name)").eq("category_key", selected.key).order("title"),
    supabase.from("trainers").select("id,first_name,last_name").eq("is_active", true).order("last_name"),
    supabase.from("ministries").select("id,name").order("name"),
    getProgramEntries(supabase, []),
    viewer.roles.superAdmin ? Promise.resolve({ data: null }) : supabase.rpc("managed_formation_session_ids"),
  ]);
  const formations = (formationsResult.data ?? []) as unknown as FormationRow[];
  const trainers = (trainersResult.data ?? []).map((item) => ({ id: item.id, name: `${item.first_name} ${item.last_name}`.trim() }));
  const ministries = (ministriesResult.data ?? []).map((item) => ({ id: item.id, name: item.name }));
  const managedIds = new Set(((managedIdsResult.data ?? []) as unknown[]).map((item) => typeof item === "string" ? item : String((item as { managed_formation_session_ids?: string }).managed_formation_session_ids ?? "")));
  const formationEntries = entries.filter((entry) => entry.kind === "course" && entry.formationCategory === selected.key && (viewer.roles.superAdmin || managedIds.has(entry.key.slice(2)))).map((entry) => ({ ...entry, href: `/gestion/enseignement/preparation/${entry.key.slice(2)}` }));

  return <div className="space-y-6">
    <ManagementPageHeader eyebrow="MES ESPACES ADMIN" title="Formations" subtitle="Cours, séances, ressources, devoirs et responsabilités dans une seule organisation." mobileTitleInAppBar />
    {allowed.length > 1 && <nav aria-label="Catégories de formation" className="flex gap-1 overflow-x-auto rounded-2xl border border-border bg-background p-1.5 [scrollbar-width:none]">{allowed.map((tab) => <Link key={tab.key} href={`/gestion/formations?onglet=${tab.query}`} aria-current={tab.key === selected.key ? "page" : undefined} className={`shrink-0 rounded-xl px-4 py-3 text-sm font-semibold ${tab.key === selected.key ? "bg-accent text-on-accent" : "text-muted hover:bg-surface hover:text-foreground"}`}>{tab.label}</Link>)}</nav>}
    {selected.key === "deepening"
      ? <DeepeningPanel formations={formations} entries={formationEntries} canCreate={viewer.roles.superAdmin} />
      : <StandardPanel formations={formations} entries={formationEntries} month={query.mois} trainers={trainers} ministries={ministries} tabQuery={selected.query} />}
  </div>;
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

function DeepeningPanel({ formations, entries, canCreate }: { formations: FormationRow[]; entries: ProgramEntry[]; canCreate: boolean }) {
  return <div className="space-y-5">
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
