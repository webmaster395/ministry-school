import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ExternalLink, FileText, Link2, Plus, Search, Video } from "lucide-react";

type Row = {
  id: string;
  title: string;
  description: string | null;
  type: "document" | "video" | "link";
  source: string;
  context: string;
  href: string;
  availableAt: string | null;
};

type SessionRelation = {
  id: string;
  description: string | null;
  course: { title: string } | null;
} | null;

type MaterialRow = {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  link_url: string | null;
  visible_at: string | null;
  session: SessionRelation;
};

type VideoRow = {
  session_id: string;
  url: string;
  visible_at: string | null;
  session: SessionRelation;
};

type OpportunityResourceRow = {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  external_url: string | null;
  file_path: string | null;
  created_at: string | null;
  opportunity: { id: string; title: string } | null;
};

export default async function AdminResourcesTab({ supabase, q }: { supabase: SupabaseClient; q: string }) {
  const [materialsResult, videosResult, opportunityResult, managedResult] = await Promise.all([
    supabase.from("materials").select("id,title,description,file_url,link_url,visible_at,session:sessions(id,description,course:courses(title))").order("created_at", { ascending: false }),
    supabase.from("session_videos").select("session_id,url,visible_at,session:sessions(id,description,course:courses(title))").order("visible_at", { ascending: false }),
    supabase.from("opportunity_resources").select("id,title,description,kind,external_url,file_path,created_at,opportunity:opportunities(id,title)").order("created_at", { ascending: false }),
    supabase.from("managed_resources").select("id,title,description,kind,status,updated_at,placements").order("updated_at", { ascending: false }),
  ]);
  const materials: Row[] = ((materialsResult.data ?? []) as unknown as MaterialRow[]).map((item) => ({
    id: `material-${item.id}`,
    title: item.title,
    description: item.description,
    type: item.link_url ? "link" : "document",
    source: "Cours",
    context: item.session?.course?.title ?? item.session?.description ?? "Séance",
    href: `/gestion/enseignement/preparation/${item.session?.id ?? ""}`,
    availableAt: item.visible_at,
  }));
  const videos: Row[] = ((videosResult.data ?? []) as unknown as VideoRow[]).map((item) => ({
    id: `video-${item.session_id}`,
    title: `Vidéo — ${item.session?.course?.title ?? item.session?.description ?? "Cours"}`,
    description: null,
    type: "video",
    source: "Cours",
    context: item.session?.course?.title ?? item.session?.description ?? "Séance",
    href: `/gestion/enseignement/preparation/${item.session_id}`,
    availableAt: item.visible_at,
  }));
  const opportunities: Row[] = ((opportunityResult.data ?? []) as unknown as OpportunityResourceRow[]).map((item) => ({
    id: `opportunity-${item.id}`,
    title: item.title,
    description: item.description,
    type: item.kind === "link" ? "link" : "document",
    source: "Projet ou formation",
    context: item.opportunity?.title ?? "Projet ou formation",
    href: `/gestion/projets-formations/${item.opportunity?.id ?? ""}?scope=admin`,
    availableAt: item.created_at,
  }));
  const managed: Row[] = (managedResult.data ?? []).map((item) => ({ id: `managed-${item.id}`, title: item.title, description: item.description, type: item.kind === "video" ? "video" : item.kind === "link" ? "link" : "document", source: `Bibliothèque · ${item.status}`, context: (item.placements ?? []).join(" · ") || "Mes ressources", href: `/admin/apps/resources/${item.id}`, availableAt: item.updated_at }));
  const words = q.toLocaleLowerCase("fr-FR").trim().split(/\s+/).filter(Boolean);
  const rows = [...managed, ...materials, ...videos, ...opportunities].filter((row) => words.every((word) => `${row.title} ${row.description ?? ""} ${row.context} ${row.source}`.toLocaleLowerCase("fr-FR").includes(word)));
  const icons = { document: FileText, video: Video, link: Link2 };
  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><form className="relative max-w-xl flex-1" method="get"><input type="hidden" name="onglet" value="contenus" /><input type="hidden" name="contenu" value="ressources" /><Search size={17} className="pointer-events-none absolute left-3.5 top-3.5 text-muted" /><input name="q" defaultValue={q} placeholder="Rechercher un titre, un cours ou une formation…" className="min-h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none focus:border-foreground" /></form><Link href="/admin/apps/resources/nouveau" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-foreground px-4 text-xs font-semibold text-on-accent"><Plus size={15}/> Ajouter une ressource</Link></div>
    <div className="flex flex-wrap gap-2 text-xs text-muted"><span className="rounded-full bg-surface px-3 py-1.5"><strong className="text-foreground">{rows.length}</strong> ressources</span><span className="rounded-full bg-surface px-3 py-1.5">{managed.length} gérées ici</span><span className="rounded-full bg-surface px-3 py-1.5">{materials.length + videos.length} liées aux cours</span><span className="rounded-full bg-surface px-3 py-1.5">{opportunities.length} liées aux projets et formations</span></div>
    <section className="overflow-hidden rounded-2xl border border-border bg-background">
      {rows.length ? <div className="divide-y divide-border-soft">{rows.map((row) => { const Icon = icons[row.type]; return <article key={row.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[40px_minmax(0,1fr)_auto] sm:items-center sm:px-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-surface text-muted"><Icon size={18} /></span><div className="min-w-0"><strong className="block truncate text-sm text-foreground">{row.title}</strong><p className="mt-0.5 truncate text-xs text-muted">{row.source} · {row.context}</p></div><Link href={row.href} className="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-link hover:underline">Gérer à la source <ExternalLink size={13} /></Link></article>; })}</div> : <p className="px-5 py-12 text-center text-sm text-muted">Aucune ressource ne correspond à cette recherche.</p>}
    </section>
    <p className="text-xs leading-5 text-muted">Les ressources historiques restent gérées à leur source. Les nouvelles ressources peuvent être associées à plusieurs emplacements sans dupliquer leur fichier.</p>
  </div>;
}
