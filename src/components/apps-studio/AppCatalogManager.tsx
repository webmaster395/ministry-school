"use client";
/* eslint-disable @next/next/no-img-element -- icônes administrées à domaine dynamique */

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink, RotateCcw, Search } from "lucide-react";
import type { CatalogApp } from "@/lib/apps/catalog";
import { formatParisSchedule } from "@/lib/apps/publication";
import { moveCatalogApp, restoreCatalogApp, saveStudentToolsSetting } from "@/app/admin/apps/actions";

export default function AppCatalogManager({ apps, archivedApps, studentToolsEnabled }: { apps: CatalogApp[]; archivedApps: CatalogApp[]; studentToolsEnabled: boolean }) {
  const [query,setQuery]=useState(""); const [status,setStatus]=useState("all");
  const shown=useMemo(()=>apps.filter((app)=>(status==="all"||app.effectiveStatus===status)&&`${app.name} ${app.displayTitle} ${app.category} ${app.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())),[apps,query,status]);
  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search size={16} className="absolute left-3 top-3.5 text-muted"/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Rechercher un outil…" className="min-h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm"/></label><select value={status} onChange={(e)=>setStatus(e.target.value)} className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm"><option value="all">Tous les statuts</option><option value="published">Publiés</option><option value="draft">Brouillons</option><option value="disabled">Masqués</option></select></div>
    <section className="overflow-hidden rounded-2xl border border-border bg-background">
      <div className="hidden grid-cols-[minmax(210px,1.5fr)_minmax(180px,1fr)_150px_100px_88px] items-center gap-4 border-b border-border-soft px-5 py-3 text-[10px] font-semibold uppercase tracking-[.12em] text-muted lg:grid">
        <span>Outil</span><span>URL</span><span>Statut</span><span>Modifier</span><span className="text-center">Ordre</span>
      </div>
      <div className="divide-y divide-border-soft">{shown.map((app, index) => <AppRow key={app.id} app={app} first={index === 0} last={index === shown.length - 1} studentToolsEnabled={studentToolsEnabled} />)}</div>
      {!shown.length && <div className="p-10 text-center text-sm text-muted">Aucun outil ne correspond aux filtres.</div>}
    </section>
    {!!archivedApps.length && <details className="rounded-2xl border border-border bg-background"><summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium [&::-webkit-details-marker]:hidden">Outils retirés du catalogue ({archivedApps.length})</summary><div className="divide-y divide-border-soft border-t border-border-soft">{archivedApps.map((app) => <div key={app.id} className="flex items-center gap-3 p-4"><AppIcon app={app} /><div className="min-w-0 flex-1"><strong className="block truncate text-sm font-medium">{app.name}</strong><span className="text-xs text-muted">Données et résultats conservés</span></div><form action={restoreCatalogApp}><input type="hidden" name="id" value={app.id} /><button className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-3 text-xs font-semibold"><RotateCcw size={13} /> Restaurer</button></form></div>)}</div></details>}
  </div>;
}

export function StudentToolsSetting({ enabled }: { enabled: boolean }) {
  return <form action={saveStudentToolsSetting} className="mb-5 flex flex-col gap-3 rounded-xl border border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
    <div><strong className="text-sm font-medium">Afficher « Mes outils » dans l’espace étudiant</strong><p className="mt-0.5 text-xs text-muted">Ce réglage reste indépendant du portail public.</p></div>
    <div className="flex items-center gap-2"><label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full bg-surface px-3 text-xs"><input className="h-4 w-4 accent-foreground" name="studentToolsEnabled" type="checkbox" defaultChecked={enabled} />{enabled ? "Visible" : "Masqué"}</label><button type="submit" className="min-h-10 rounded-full bg-foreground px-4 text-xs font-semibold text-on-accent">Enregistrer</button></div>
  </form>;
}

function AppRow({ app, first, last, studentToolsEnabled }: { app: CatalogApp; first: boolean; last: boolean; studentToolsEnabled: boolean }) {
  const date = publicationSummary(app);
  return <article className="grid gap-3 px-4 py-4 transition hover:bg-surface/60 lg:grid-cols-[minmax(210px,1.5fr)_minmax(180px,1fr)_150px_100px_88px] lg:items-center lg:gap-4 lg:px-5">
    <div className="flex min-w-0 items-center gap-3"><AppIcon app={app} /><div className="min-w-0"><strong className="block truncate text-sm font-medium">{app.displayTitle}</strong><span className="block truncate text-[11px] text-muted">{app.toolType} · {[app.placementStory&&"Story",app.placementPost&&"Post",app.placementResources&&"Ressources",app.placementWork&&"Travail"].filter(Boolean).join(" · ")||"Aucun emplacement"}</span></div></div>
    <a className="inline-flex min-w-0 items-center gap-1.5 text-xs text-link hover:underline" href={app.url} target="_blank" rel="noreferrer"><span className="truncate">{app.destinationUrl.replace(/^https?:\/\//, "")}</span><ExternalLink size={12} className="shrink-0" /></a>
    <div className="flex flex-wrap items-center gap-2 lg:block"><StatusBadge status={app.effectiveStatus} /><span className="text-[11px] text-muted lg:mt-1 lg:block">{date}{!studentToolsEnabled && app.studentEnabled ? " · espace étudiant masqué" : ""}</span></div>
    <Link href={`/admin/apps/${app.slug}`} className="inline-flex min-h-9 w-fit items-center rounded-full border border-border px-3 text-xs font-medium hover:bg-surface">Modifier</Link>
    <div className="flex items-center gap-1 lg:justify-center" aria-label={`Modifier l’ordre de ${app.name}`}><MoveButton app={app} direction="up" disabled={first} icon={<ArrowUp size={14} />} label="Monter" /><MoveButton app={app} direction="down" disabled={last} icon={<ArrowDown size={14} />} label="Descendre" /></div>
  </article>;
}

function MoveButton({ app, direction, disabled, icon, label }: { app: CatalogApp; direction: "up" | "down"; disabled: boolean; icon: React.ReactNode; label: string }) {
  return <form action={moveCatalogApp}><input type="hidden" name="id" value={app.id} /><input type="hidden" name="direction" value={direction} /><button disabled={disabled} aria-label={`${label} ${app.name}`} title={label} className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted hover:bg-surface disabled:cursor-not-allowed disabled:opacity-25">{icon}</button></form>;
}

function AppIcon({ app }: { app: CatalogApp }) { return app.iconUrl ? <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[11px] bg-surface"><img className="h-full w-full object-contain" src={app.iconUrl} alt="" /></span> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-surface font-title text-lg">{app.name.slice(0, 1)}</span>; }
function StatusBadge({ status }: { status: CatalogApp["effectiveStatus"] }) { const label = status === "published" ? "Publié" : status === "scheduled" ? "Programmé" : status === "disabled" ? "Désactivé" : "Brouillon"; return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${status === "published" ? "bg-[#dceee5] text-[#28634f]" : status === "scheduled" ? "bg-[#fff0d5] text-[#8a642c]" : "bg-surface text-muted"}`}>{label}</span>; }
function publicationSummary(app: CatalogApp) { const dates = [app.publicEnabled ? app.publicPublishAt : null, app.studentEnabled ? app.studentPublishAt : null].filter(Boolean) as string[]; if (dates.length) return formatParisSchedule(dates.sort()[0]); if (app.publicEnabled || app.studentEnabled) return "Immédiate"; return "Non publié"; }
