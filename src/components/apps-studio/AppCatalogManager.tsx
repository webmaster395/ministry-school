"use client";
/* eslint-disable @next/next/no-img-element -- icônes administrées à domaine dynamique */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Copy, ExternalLink, MoreHorizontal, Pencil, Power, RotateCcw, Trash2 } from "lucide-react";
import type { CatalogApp } from "@/lib/apps/catalog";
import { formatParisSchedule } from "@/lib/apps/publication";
import {
  deleteCatalogApp,
  duplicateCatalogApp,
  moveCatalogApp,
  restoreCatalogApp,
  saveStudentToolsSetting,
  setCatalogAppStatus,
} from "@/app/admin/apps/actions";

export default function AppCatalogManager({ apps, archivedApps, studentToolsEnabled }: { apps: CatalogApp[]; archivedApps: CatalogApp[]; studentToolsEnabled: boolean }) {
  return <div className="space-y-7">
    <StudentToolsSetting enabled={studentToolsEnabled} />
    <section className="rounded-[24px] border border-[#20302e]/10 bg-white shadow-[0_16px_50px_rgba(32,48,46,.05)]">
      <div className="hidden grid-cols-[minmax(240px,2fr)_120px_160px_minmax(160px,1fr)_84px_92px] gap-4 border-b border-[#20302e]/8 px-6 py-3 text-[10px] font-semibold uppercase tracking-[.13em] text-[#7a8582] xl:grid">
        <span>Application</span><span>Statut</span><span>Publication</span><span>URL</span><span>Ordre</span><span className="text-right">Actions</span>
      </div>
      <div className="divide-y divide-[#20302e]/8">{apps.map((app, index) => <AppRow key={app.id} app={app} first={index === 0} last={index === apps.length - 1} studentToolsEnabled={studentToolsEnabled} />)}</div>
      {!apps.length && <div className="p-10 text-center text-sm text-[#697572]">Aucune application dans le catalogue.</div>}
    </section>
    {!!archivedApps.length && <section><h2 className="mb-3 font-title text-xl font-normal">Applications archivées</h2><div className="divide-y divide-[#20302e]/8 rounded-[20px] border border-[#20302e]/10 bg-white">{archivedApps.map((app) => <div key={app.id} className="flex items-center gap-4 p-4"><AppIcon app={app} /><div className="min-w-0 flex-1"><strong className="block truncate font-medium">{app.name}</strong><span className="text-xs text-[#75807d]">Retirée du catalogue, données conservées</span></div><form action={restoreCatalogApp}><input type="hidden" name="id" value={app.id} /><button className="inline-flex items-center gap-2 rounded-full border border-[#20302e]/15 px-3 py-2 text-xs font-semibold"><RotateCcw size={13} /> Restaurer</button></form></div>)}</div></section>}
  </div>;
}

function StudentToolsSetting({ enabled }: { enabled: boolean }) {
  return <form action={saveStudentToolsSetting} className="flex flex-col gap-4 rounded-[20px] border border-[#20302e]/10 bg-[#edf2ee] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
    <div><strong className="font-title text-lg font-normal">« Mes outils » dans l’espace étudiant</strong><p className="mt-1 text-xs leading-5 text-[#697572]">Indépendant du portail public /apps.</p></div>
    <div className="flex flex-wrap items-center gap-3"><label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full bg-white px-4 text-sm"><input className="h-4 w-4 accent-[#20302e]" name="studentToolsEnabled" type="checkbox" defaultChecked={enabled} />{enabled ? "Visible" : "Masqué"}</label><button type="submit" className="rounded-full bg-[#20302e] px-4 py-2.5 text-sm font-semibold text-[#fbeeda]">Enregistrer</button></div>
  </form>;
}

function AppRow({ app, first, last, studentToolsEnabled }: { app: CatalogApp; first: boolean; last: boolean; studentToolsEnabled: boolean }) {
  const settingsHref = `/admin/apps/${app.slug}/settings`;
  const date = publicationSummary(app);
  return <article className="relative grid gap-4 p-5 transition hover:bg-[#f9faf8] xl:grid-cols-[minmax(240px,2fr)_120px_160px_minmax(160px,1fr)_84px_92px] xl:items-center xl:px-6">
    <Link href={`/admin/apps/${app.slug}`} className="absolute inset-0" aria-label={`Gérer ${app.name}`} />
    <div className="relative pointer-events-none flex min-w-0 items-center gap-4"><AppIcon app={app} /><div className="min-w-0"><Link href={`/admin/apps/${app.slug}`} className="pointer-events-auto relative z-10 block truncate font-medium hover:underline">{app.name}</Link><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#75807d]">{app.description || app.category}</p><span className="mt-1 block text-[10px] uppercase tracking-[.12em] text-[#87908e]">{app.category}</span></div></div>
    <div><StatusBadge status={app.effectiveStatus} /></div>
    <div className="text-sm"><span className="block text-xs text-[#697572]">{date.label}</span><span className="mt-1 block font-medium">{date.value}</span>{!studentToolsEnabled && app.studentEnabled && <span className="mt-1 block text-[10px] text-[#9a7041]">Mes outils masqué globalement</span>}</div>
    <a className="relative z-10 inline-flex min-w-0 items-center gap-1.5 truncate text-sm text-[#406860] hover:underline" href={app.url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}><span className="truncate">{app.destinationUrl.replace(/^https?:\/\//, "")}</span><ExternalLink size={12} className="shrink-0" /></a>
    <div className="relative z-10 flex items-center gap-1" aria-label="Réorganiser"><MoveButton app={app} direction="up" disabled={first} icon={<ArrowUp size={15} />} label="Monter" /><MoveButton app={app} direction="down" disabled={last} icon={<ArrowDown size={15} />} label="Descendre" /></div>
    <div className="relative z-20 flex justify-end"><ActionMenu app={app} settingsHref={settingsHref} /></div>
  </article>;
}

function MoveButton({ app, direction, disabled, icon, label }: { app: CatalogApp; direction: "up" | "down"; disabled: boolean; icon: React.ReactNode; label: string }) {
  return <form action={moveCatalogApp} onClick={(event) => event.stopPropagation()}><input type="hidden" name="id" value={app.id} /><input type="hidden" name="direction" value={direction} /><button disabled={disabled} aria-label={`${label} ${app.name}`} title={label} className="grid h-9 w-9 place-items-center rounded-full border border-[#20302e]/10 text-[#50615e] transition hover:bg-[#edf2ee] disabled:cursor-not-allowed disabled:opacity-25">{icon}</button></form>;
}

function ActionMenu({ app, settingsHref }: { app: CatalogApp; settingsHref: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const closeEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeEscape); };
  }, [open]);
  const enabling = app.status === "disabled" || app.status === "draft";
  return <div ref={root} className="relative"><button type="button" onClick={(event) => { event.stopPropagation(); setOpen((value) => !value); }} aria-haspopup="menu" aria-expanded={open} aria-label={`Actions pour ${app.name}`} className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-[#edf2ee]"><MoreHorizontal size={19} /></button>{open && <div role="menu" className="absolute right-0 top-11 z-30 w-56 rounded-2xl border border-[#20302e]/10 bg-white p-2 shadow-[0_16px_45px_rgba(32,48,46,.16)]"><MenuLink href={settingsHref} icon={<Pencil size={14} />}>Modifier</MenuLink><MenuLink href={app.url} external icon={<ExternalLink size={14} />}>Voir l’application</MenuLink><form action={duplicateCatalogApp}><input type="hidden" name="id" value={app.id} /><MenuButton icon={<Copy size={14} />}>Dupliquer</MenuButton></form><form action={setCatalogAppStatus} onSubmit={(event) => { if (!enabling && !window.confirm(`Désactiver « ${app.name} » ?`)) event.preventDefault(); }}><input type="hidden" name="id" value={app.id} /><input type="hidden" name="nextStatus" value={enabling ? "published" : "disabled"} /><MenuButton icon={<Power size={14} />}>{enabling ? "Activer" : "Désactiver"}</MenuButton></form><div className="my-1 border-t border-[#20302e]/8" /><form action={deleteCatalogApp} onSubmit={(event) => { if (!window.confirm(`Retirer « ${app.name} » du catalogue ? Son code, ses résultats, ses données et son projet Vercel seront conservés.`)) event.preventDefault(); }}><input type="hidden" name="id" value={app.id} /><MenuButton danger icon={<Trash2 size={14} />}>Supprimer</MenuButton></form></div>}</div>;
}

function MenuLink({ href, icon, external = false, children }: { href: string; icon: React.ReactNode; external?: boolean; children: React.ReactNode }) { return <Link role="menuitem" href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-[#f1f4f1]">{icon}{children}</Link>; }
function MenuButton({ icon, danger = false, children }: { icon: React.ReactNode; danger?: boolean; children: React.ReactNode }) { return <button role="menuitem" type="submit" className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-[#f1f4f1] ${danger ? "text-[#a23b2a]" : ""}`}>{icon}{children}</button>; }

function AppIcon({ app }: { app: CatalogApp }) { return app.iconUrl ? <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-[#f1f4f1]"><img className="h-full w-full object-contain" src={app.iconUrl} alt="" /></span> : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-[#e8eeea] font-title text-xl">{app.name.slice(0, 1)}</span>; }
function StatusBadge({ status }: { status: CatalogApp["effectiveStatus"] }) { const label = status === "published" ? "Publiée" : status === "scheduled" ? "Programmée" : status === "disabled" ? "Désactivée" : "Brouillon"; return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${status === "published" ? "bg-[#dceee5] text-[#28634f]" : status === "scheduled" ? "bg-[#fff0d5] text-[#8a642c]" : "bg-[#eef0ed] text-[#606a67]"}`}>{label}</span>; }

function publicationSummary(app: CatalogApp) {
  const dated = [{ label: "Portail public", value: app.publicPublishAt, enabled: app.publicEnabled }, { label: "Espace étudiant", value: app.studentPublishAt, enabled: app.studentEnabled }].filter((item) => item.enabled);
  const scheduled = dated.filter((item) => item.value).sort((a, b) => new Date(a.value!).getTime() - new Date(b.value!).getTime())[0];
  if (scheduled) return { label: scheduled.label, value: formatParisSchedule(scheduled.value) };
  if (dated.length) return { label: dated.length > 1 ? "Public et étudiants" : dated[0].label, value: "Immédiate" };
  return { label: "Publication", value: "Non publiée" };
}
