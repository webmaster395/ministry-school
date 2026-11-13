"use client";

import { useMemo, useState } from "react";
import { BookOpen, ExternalLink, FileText, Link2, PlayCircle, Search, Shapes } from "lucide-react";
import type { LibraryResource, LibraryResourceKind, LibraryResourceSource } from "@/lib/data/resource-library";

const kinds: Array<{ key: "all" | LibraryResourceKind; label: string }> = [
  { key: "all", label: "Tous les formats" },
  { key: "pdf", label: "PDF" },
  { key: "video", label: "Vidéos" },
  { key: "link", label: "Liens" },
  { key: "tool", label: "Outils" },
];

const sources: Array<{ key: "all" | LibraryResourceSource; label: string }> = [
  { key: "all", label: "Tout" },
  { key: "course", label: "Cours" },
  { key: "opportunity", label: "Projets et formations" },
  { key: "library", label: "Bibliothèque" },
];

const kindMeta = {
  pdf: { label: "PDF", icon: FileText, tone: "bg-[#f3eee5] text-[#714d2f]" },
  video: { label: "Vidéo", icon: PlayCircle, tone: "bg-[#e8eeeb] text-[#245548]" },
  link: { label: "Lien", icon: Link2, tone: "bg-[#eceaf4] text-[#574783]" },
  tool: { label: "Outil", icon: Shapes, tone: "bg-[#f3e9e5] text-[#844834]" },
} as const;

export default function ResourceLibrary({ resources }: { resources: LibraryResource[] }) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<"all" | LibraryResourceSource>("all");
  const [kind, setKind] = useState<"all" | LibraryResourceKind>("all");
  const normalizedQuery = query.trim().toLocaleLowerCase("fr-FR");
  const filtered = useMemo(() => resources.filter((resource) => {
    if (source !== "all" && resource.source !== source) return false;
    if (kind !== "all" && resource.kind !== kind) return false;
    if (!normalizedQuery) return true;
    return `${resource.title} ${resource.description ?? ""} ${resource.sourceTitle}`.toLocaleLowerCase("fr-FR").includes(normalizedQuery);
  }), [resources, source, kind, normalizedQuery]);

  return <div className="space-y-6">
    <section className="overflow-hidden rounded-[28px] bg-[#252d2c] text-white">
      <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end">
        <div><p className="label text-[11px] tracking-[.18em] text-white/60">MA BIBLIOTHÈQUE</p><h1 className="font-title mt-3 max-w-2xl text-[clamp(1.65rem,3vw,2.25rem)] leading-[1.08]">Tout ce qui t’aide à aller plus loin.</h1><p className="mt-5 max-w-2xl text-sm leading-6 text-white/72 sm:text-base">Retrouve au même endroit les supports de tes cours, tes outils, les tests disponibles et les ressources partagées après tes projets et formations.</p></div>
        <div className="grid grid-cols-2 gap-3"><Metric value={resources.length} label="ressources" /><Metric value={new Set(resources.map((resource) => resource.sourceTitle)).size} label="espaces" /></div>
      </div>
    </section>

    <section className="rounded-3xl border border-border bg-background p-4 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_auto] lg:items-center">
        <label className="relative block"><Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" /><span className="sr-only">Rechercher une ressource</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un titre, un cours ou un projet…" className="min-h-12 w-full rounded-2xl border border-border bg-surface pl-11 pr-4 text-sm outline-none transition focus:border-foreground" /></label>
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filtrer par origine">{sources.map((item) => <button key={item.key} type="button" onClick={() => setSource(item.key)} aria-pressed={source === item.key} className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-semibold transition ${source === item.key ? "bg-foreground text-background" : "border border-border text-muted hover:text-foreground"}`}>{item.label}</button>)}</div>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto border-t border-border-soft pt-4" aria-label="Filtrer par format">{kinds.map((item) => <button key={item.key} type="button" onClick={() => setKind(item.key)} aria-pressed={kind === item.key} className={`min-h-9 shrink-0 rounded-full px-3.5 text-xs font-medium transition ${kind === item.key ? "bg-accent text-on-accent" : "bg-surface text-muted hover:text-foreground"}`}>{item.label}</button>)}</div>
    </section>

    <div className="flex items-center justify-between gap-3"><h2 className="font-title text-[24px] sm:text-[29px]">{filtered.length} ressource{filtered.length === 1 ? "" : "s"}</h2>{(query || source !== "all" || kind !== "all") && <button type="button" onClick={() => { setQuery(""); setSource("all"); setKind("all"); }} className="text-sm font-semibold text-muted underline underline-offset-4">Réinitialiser</button>}</div>

    {filtered.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((resource) => {
      const meta = kindMeta[resource.kind];
      const Icon = meta.icon;
      const external = /^https?:\/\//.test(resource.href);
      return <a key={resource.id} href={resource.href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="group flex min-h-[220px] flex-col rounded-3xl border border-border bg-background p-5 transition hover:-translate-y-0.5 hover:border-foreground hover:shadow-[0_14px_35px_rgba(24,31,30,.08)]">
        <div className="flex items-start justify-between gap-3"><span className={`grid h-11 w-11 place-items-center rounded-2xl ${meta.tone}`}><Icon size={21} /></span><ExternalLink size={16} className="text-muted transition group-hover:text-foreground" /></div>
        <div className="mt-8 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-muted">{resource.sourceLabel} · {meta.label}</p><h3 className="font-title mt-2 text-[21px] leading-tight text-foreground">{resource.title}</h3>{resource.description && <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted">{resource.description}</p>}</div>
        <p className="mt-5 flex items-center gap-2 border-t border-border-soft pt-4 text-xs font-medium text-muted"><BookOpen size={14} /><span className="truncate">{resource.sourceTitle}</span></p>
      </a>;
    })}</div> : <div className="rounded-3xl border border-dashed border-border bg-background px-6 py-16 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface text-muted"><Search size={21} /></span><h2 className="font-title mt-4 text-xl">Aucune ressource trouvée</h2><p className="mt-2 text-sm text-muted">Modifie ta recherche ou tes filtres.</p></div>}
  </div>;
}

function Metric({ value, label }: { value: number; label: string }) {
  return <div className="rounded-2xl bg-white/10 p-4"><strong className="font-title block text-3xl">{value}</strong><span className="mt-1 block text-xs text-white/60">{label}</span></div>;
}
