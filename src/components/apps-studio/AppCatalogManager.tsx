"use client";
/* eslint-disable @next/next/no-img-element -- icônes administrées et aperçus blob à domaine dynamique */

import { useState } from "react";
import { Archive, ChevronDown, ExternalLink, MoreHorizontal, Plus, RotateCcw, Save } from "lucide-react";
import type { CatalogApp } from "@/lib/apps/catalog";
import { formatParisSchedule, toParisDateTimeLocal } from "@/lib/apps/publication";
import {
  deleteCatalogApp,
  restoreCatalogApp,
  saveCatalogApp,
  saveStudentToolsSetting,
  setCatalogAppStatus,
} from "@/app/admin/apps/actions";

export default function AppCatalogManager({ apps, archivedApps, studentToolsEnabled }: { apps: CatalogApp[]; archivedApps: CatalogApp[]; studentToolsEnabled: boolean }) {
  const [adding, setAdding] = useState(false);
  return <div className="space-y-8">
    <StudentToolsSetting enabled={studentToolsEnabled} />
    <section>
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><p className="label text-[10px] text-[#50726c]">CATALOGUE</p><h2 className="mt-1 font-title text-2xl">Applications pédagogiques</h2></div>
        <button type="button" onClick={() => setAdding((open) => !open)} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#20302e] px-5 py-3 text-sm font-semibold text-[#fbeeda]"><Plus size={16} /> Ajouter une application</button>
      </div>
      {adding && <div className="mb-5"><AppForm /></div>}
      <div className="grid gap-4 xl:grid-cols-2">{apps.map((app) => <AppForm app={app} key={app.id} />)}</div>
      {!apps.length && !adding && <div className="rounded-[24px] border border-dashed border-[#20302e]/15 bg-white p-8 text-center text-[#697572]">Aucune application dans le catalogue.</div>}
    </section>
    {!!archivedApps.length && <section><h2 className="mb-4 font-title text-xl">Applications archivées</h2><div className="grid gap-3 sm:grid-cols-2">{archivedApps.map((app) => <div key={app.id} className="flex items-center gap-4 rounded-[20px] border border-[#20302e]/10 bg-white p-4"><AppIcon app={app} /><div className="min-w-0 flex-1"><strong className="block truncate">{app.name}</strong><span className="text-xs text-[#75807d]">Retirée du catalogue</span></div><form action={restoreCatalogApp}><input type="hidden" name="id" value={app.id} /><button className="inline-flex items-center gap-2 rounded-full border border-[#20302e]/15 px-3 py-2 text-xs font-semibold"><RotateCcw size={13} /> Restaurer</button></form></div>)}</div></section>}
  </div>;
}

function StudentToolsSetting({ enabled }: { enabled: boolean }) {
  return <form action={saveStudentToolsSetting} className="flex flex-col gap-5 rounded-[24px] border border-[#20302e]/10 bg-white p-5 shadow-[0_16px_50px_rgba(32,48,46,.05)] sm:flex-row sm:items-center sm:justify-between sm:p-7">
    <div className="max-w-2xl"><p className="label text-[10px] text-[#50726c]">ESPACE ÉTUDIANT</p><h2 className="mt-2 font-title text-2xl">Afficher « Mes outils »</h2><p className="mt-2 text-sm leading-6 text-[#697572]">Ce réglage contrôle uniquement la rubrique étudiante. Le portail public /apps continue de fonctionner indépendamment.</p></div>
    <div className="flex flex-wrap items-center gap-3"><label className="inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-full bg-[#f1f4f1] px-4 text-sm font-semibold"><input className="h-4 w-4 accent-[#20302e]" name="studentToolsEnabled" type="checkbox" defaultChecked={enabled} /><span>{enabled ? "Visible actuellement" : "Masquée actuellement"}</span></label><button type="submit" className="rounded-full bg-[#20302e] px-5 py-3 text-sm font-semibold text-[#fbeeda]">Enregistrer</button></div>
  </form>;
}

function AppForm({ app }: { app?: CatalogApp }) {
  const [name, setName] = useState(app?.name ?? "");
  const [category, setCategory] = useState(app?.category ?? "");
  const [preview, setPreview] = useState(app?.iconUrl ?? null);
  return <details className="group rounded-[24px] border border-[#20302e]/10 bg-white shadow-[0_16px_50px_rgba(32,48,46,.05)]" open={!app}>
    <summary className="flex cursor-pointer list-none items-center gap-4 p-5 sm:p-6">
      <AppIcon app={app} />
      <span className="min-w-0 flex-1"><strong className="block truncate text-lg">{app?.name ?? "Nouvelle application"}</strong><span className="mt-1 flex flex-wrap gap-2 text-xs text-[#75807d]">{app ? <><StatusBadge status={app.effectiveStatus} /><VisibilityBadge visible={app.publicVisible} label="Public" /><VisibilityBadge visible={app.studentVisible} label="Étudiants" /></> : "Configurer sa publication"}</span></span>
      {app && <a href={app.url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="rounded-full p-2 text-[#687572] hover:bg-[#f1f4f1]" aria-label={`Ouvrir ${app.name}`}><ExternalLink size={17} /></a>}
      <span className="hidden rounded-full border border-[#20302e]/12 px-3 py-2 text-xs font-semibold sm:inline">Modifier</span><ChevronDown className="transition group-open:rotate-180" size={19} />
    </summary>
    <form action={saveCatalogApp} className="grid gap-5 border-t border-[#20302e]/8 p-5 sm:grid-cols-2 sm:p-6">
      <input type="hidden" name="id" value={app?.id ?? ""} /><input type="hidden" name="slug" value={app?.slug ?? ""} /><input type="hidden" name="currentIcon" value={app?.iconUrl ?? ""} /><input type="hidden" name="integrationKey" value={app?.integrationKey ?? ""} />
      <div className="sm:col-span-2"><LaunchpadPreview name={name} category={category} icon={preview} /></div>
      <Field label="Nom de l’application"><input name="name" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></Field>
      <Field label="Catégorie"><input name="category" required maxLength={80} value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Finance, Identité…" /></Field>
      <Field label="Description courte" className="sm:col-span-2"><textarea name="description" rows={2} maxLength={240} defaultValue={app?.description} /></Field>
      <Field label="URL de l’application" className="sm:col-span-2"><input name="url" type="url" required defaultValue={app?.destinationUrl} placeholder="https://…" /></Field>
      <Field label="Statut"><select name="status" defaultValue={app?.status ?? "draft"}><option value="draft">Brouillon</option><option value="scheduled">Programmée</option><option value="published">Publiée</option><option value="disabled">Désactivée</option></select></Field>
      <Field label="Ordre d’affichage"><input name="order" type="number" min={0} defaultValue={app?.order ?? 0} /></Field>
      <IconInput preview={preview} setPreview={setPreview} />
      <ChannelConfig type="public" title="Portail public" description="Visible sans connexion sur /apps." enabled={app?.publicEnabled ?? false} publishAt={app?.publicPublishAt ?? null} />
      <ChannelConfig type="student" title="Espace étudiant" description="Visible dans « Mes outils » quand la rubrique est activée." enabled={app?.studentEnabled ?? false} publishAt={app?.studentPublishAt ?? null} />
      <div className="flex flex-wrap items-center justify-end gap-3 sm:col-span-2"><span className="mr-auto text-xs text-[#75807d]">Les horaires programmés utilisent Europe/Paris.</span><button className="inline-flex items-center gap-2 rounded-full bg-[#20302e] px-5 py-3 text-sm font-semibold text-[#fbeeda]" type="submit"><Save size={15} /> Enregistrer</button></div>
    </form>
    {app && <AppActions app={app} />}
  </details>;
}

function ChannelConfig({ type, title, description, enabled, publishAt }: { type: "public" | "student"; title: string; description: string; enabled: boolean; publishAt: string | null }) {
  const [mode, setMode] = useState(publishAt ? "scheduled" : "immediate");
  return <fieldset className="rounded-[18px] border border-[#20302e]/10 bg-[#f8faf7] p-4 sm:col-span-2"><legend className="sr-only">{title}</legend><div className="flex flex-col gap-4 lg:flex-row lg:items-end"><label className="flex flex-1 cursor-pointer items-start gap-3"><input name={`${type}Enabled`} type="checkbox" defaultChecked={enabled} className="mt-1 h-4 w-4 accent-[#20302e]" /><span><strong className="block text-sm">Visible — {title}</strong><span className="mt-1 block text-xs leading-5 text-[#75807d]">{description}</span>{enabled && <span className="mt-1 block text-xs font-medium text-[#50726c]">{publishAt ? `Programmée : ${formatParisSchedule(publishAt)}` : "Publication immédiate"}</span>}</span></label><label className="grid gap-2 text-xs font-semibold">Publication<select name={`${type}Mode`} value={mode} onChange={(event) => setMode(event.target.value)} className="min-h-11 rounded-xl border bg-white px-3 text-sm"><option value="immediate">Immédiate</option><option value="scheduled">Programmée</option></select></label>{mode === "scheduled" && <label className="grid gap-2 text-xs font-semibold">Date et heure<input name={`${type}DateTime`} required type="datetime-local" defaultValue={toParisDateTimeLocal(publishAt)} className="min-h-11 rounded-xl border bg-white px-3 text-sm" /></label>}</div></fieldset>;
}

function AppActions({ app }: { app: CatalogApp }) {
  const enabling = app.status === "disabled" || app.status === "draft";
  return <div className="flex items-center justify-end border-t border-[#20302e]/8 px-5 py-4 sm:px-6"><details className="relative"><summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-[#20302e]/12 px-4 py-2 text-sm font-semibold"><MoreHorizontal size={16} /> Actions</summary><div className="absolute bottom-12 right-0 z-20 grid w-60 gap-1 rounded-2xl border border-[#20302e]/10 bg-white p-2 shadow-xl"><form action={setCatalogAppStatus}><input type="hidden" name="id" value={app.id} /><input type="hidden" name="nextStatus" value={enabling ? "published" : "disabled"} /><button className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-[#f1f4f1]" type="submit">{enabling ? "Activer l’application" : "Désactiver l’application"}</button></form><form action={deleteCatalogApp} onSubmit={(event) => { if (!window.confirm(`Archiver « ${app.name} » ? Son code, ses données, ses résultats et son intégration externe seront conservés.`)) event.preventDefault(); }}><input type="hidden" name="id" value={app.id} /><button type="submit" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-[#a23b2a] hover:bg-[#fff4f1]"><Archive size={14} /> Archiver le catalogue</button></form></div></details></div>;
}

function LaunchpadPreview({ name, category, icon }: { name: string; category: string; icon: string | null }) {
  return <div className="rounded-[18px] bg-[#edf2ee] p-4"><p className="label text-[9px] text-[#687572]">APERÇU LAUNCHPAD</p><div className="mt-3 flex items-center gap-3"><span className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-white">{icon ? <img src={icon} alt="" className="h-full w-full object-contain" /> : <span className="font-title text-xl">{name.slice(0, 1) || "+"}</span>}</span><span><strong className="block">{name || "Nom de l’application"}</strong><span className="text-xs text-[#75807d]">{category || "Catégorie"}</span></span></div></div>;
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return <label className={`grid gap-2 text-sm font-semibold ${className}`}>{label}<span className="contents [&_input]:min-h-12 [&_input]:rounded-xl [&_input]:border [&_input]:px-4 [&_select]:min-h-12 [&_select]:rounded-xl [&_select]:border [&_select]:px-4 [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:px-4 [&_textarea]:py-3">{children}</span></label>;
}

function AppIcon({ app }: { app?: CatalogApp }) {
  if (app?.iconUrl) return <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#f1f4f1]"><img className="h-full w-full object-contain" src={app.iconUrl} alt="" /></span>;
  return <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#e8eeea] font-title text-xl">{app?.name.slice(0, 1) ?? "+"}</span>;
}

function IconInput({ preview, setPreview }: { preview: string | null; setPreview: (value: string) => void }) {
  return <Field label="Icône" className="sm:col-span-2"><span className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center">{preview && <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#f1f4f1]"><img src={preview} alt="Aperçu de l’icône" className="h-full w-full object-contain" /></span>}<input name="icon" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => { const file = event.target.files?.[0]; if (file) setPreview(URL.createObjectURL(file)); }} /></span></Field>;
}

function StatusBadge({ status }: { status: CatalogApp["effectiveStatus"] }) { return <span className="rounded-full bg-[#eef1ec] px-2 py-1 font-semibold text-[#43504d]">{statusLabel(status)}</span>; }
function VisibilityBadge({ visible, label }: { visible: boolean; label: string }) { return <span className={`rounded-full px-2 py-1 font-semibold ${visible ? "bg-[#dceee5] text-[#28634f]" : "bg-[#f2f1ed] text-[#7c817f]"}`}>{label} · {visible ? "visible" : "masquée"}</span>; }
function statusLabel(status: CatalogApp["status"]) { return status === "published" ? "Publiée" : status === "scheduled" ? "Programmée" : status === "disabled" ? "Désactivée" : "Brouillon"; }
