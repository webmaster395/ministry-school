"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink, Plus, Save, Trash2 } from "lucide-react";
import type { CatalogApp } from "@/lib/apps/catalog";
import { deleteCatalogApp, saveCatalogApp } from "@/app/admin/apps/actions";

export default function AppCatalogManager({ apps }: { apps: CatalogApp[] }) {
  const [adding, setAdding] = useState(false);
  return <div className="space-y-5">
    <div className="flex justify-end"><button type="button" onClick={() => setAdding((open) => !open)} className="inline-flex items-center gap-2 rounded-full bg-[#20302e] px-5 py-3 text-sm font-semibold text-[#fbeeda]"><Plus size={16} /> Ajouter une application</button></div>
    {adding && <AppForm />}
    <div className="grid gap-4 xl:grid-cols-2">{apps.map((app) => <AppForm app={app} key={app.id} />)}</div>
  </div>;
}

function AppForm({ app }: { app?: CatalogApp }) {
  return <details className="group rounded-[24px] border border-[#20302e]/10 bg-white shadow-[0_16px_50px_rgba(32,48,46,.05)]" open={!app}>
    <summary className="flex cursor-pointer list-none items-center gap-4 p-5 sm:p-6">
      <AppIcon app={app} />
      <span className="min-w-0 flex-1"><strong className="block truncate text-lg">{app?.name ?? "Nouvelle application"}</strong><span className="mt-1 block text-sm text-[#75807d]">{app ? `${app.category} · ${statusLabel(app.status)}` : "Configurer son apparition dans le Launchpad"}</span></span>
      {app && <a href={app.url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="rounded-full p-2 text-[#687572] hover:bg-[#f1f4f1]" aria-label={`Ouvrir ${app.name}`}><ExternalLink size={17} /></a>}
      <ChevronDown className="transition group-open:rotate-180" size={19} />
    </summary>
    <form action={saveCatalogApp} className="grid gap-5 border-t border-[#20302e]/8 p-5 sm:grid-cols-2 sm:p-6">
      <input type="hidden" name="id" value={app?.id ?? ""} /><input type="hidden" name="slug" value={app?.slug ?? ""} /><input type="hidden" name="currentIcon" value={app?.iconUrl ?? ""} /><input type="hidden" name="integrationKey" value={app?.integrationKey ?? ""} />
      <Field label="Nom de l’application"><input name="name" required maxLength={100} defaultValue={app?.name} /></Field>
      <Field label="Catégorie"><input name="category" required maxLength={80} defaultValue={app?.category} placeholder="Finance, Identité…" /></Field>
      <Field label="Description courte" className="sm:col-span-2"><textarea name="description" rows={2} maxLength={240} defaultValue={app?.description} /></Field>
      <Field label="URL de destination" className="sm:col-span-2"><input name="url" type="text" required defaultValue={app?.url} placeholder="https://… ou /apps/…" /></Field>
      <Field label="Statut"><select name="status" defaultValue={app?.status ?? "draft"}><option value="draft">Brouillon</option><option value="published">Publiée</option><option value="hidden">Masquée</option></select></Field>
      <Field label="Ordre d’affichage"><input name="order" type="number" defaultValue={app?.order ?? 0} /></Field>
      <IconInput current={app?.iconUrl ?? null} />
      <div className="flex flex-wrap justify-end gap-3 sm:col-span-2"><button className="inline-flex items-center gap-2 rounded-full bg-[#20302e] px-5 py-3 text-sm font-semibold text-[#fbeeda]" type="submit"><Save size={15} /> Enregistrer</button></div>
    </form>
    {app && <form action={deleteCatalogApp} onSubmit={(event) => { if (!window.confirm(`Retirer « ${app.name} » du catalogue ? Ses données et son projet externe seront conservés.`)) event.preventDefault(); }} className="border-t border-[#20302e]/8 px-6 py-4 text-right"><input type="hidden" name="id" value={app.id} /><button type="submit" className="inline-flex items-center gap-2 text-sm text-[#a23b2a]"><Trash2 size={14} /> Retirer du catalogue</button></form>}
  </details>;
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return <label className={`grid gap-2 text-sm font-semibold ${className}`}>{label}<span className="contents [&_input]:min-h-12 [&_input]:rounded-xl [&_input]:border [&_input]:px-4 [&_select]:min-h-12 [&_select]:rounded-xl [&_select]:border [&_select]:px-4 [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:px-4 [&_textarea]:py-3">{children}</span></label>;
}

function AppIcon({ app }: { app?: CatalogApp }) {
  if (app?.iconUrl) return <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#f1f4f1]">
    {/* eslint-disable-next-line @next/next/no-img-element -- URL administrée, domaine dynamique */}
    <img className="h-full w-full object-contain" src={app.iconUrl} alt="" />
  </span>;
  return <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#e8eeea] font-title text-xl">{app?.name.slice(0, 1) ?? "+"}</span>;
}

function IconInput({ current }: { current: string | null }) {
  const [preview, setPreview] = useState(current);
  return <Field label="Icône" className="sm:col-span-2"><span className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center">{preview && <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#f1f4f1]">
    {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local ou URL administrée */}
    <img src={preview} alt="Aperçu de l’icône" className="h-full w-full object-contain" />
  </span>}<input name="icon" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => { const file = event.target.files?.[0]; if (file) setPreview(URL.createObjectURL(file)); }} /></span></Field>;
}

function statusLabel(status: CatalogApp["status"]) { return status === "published" ? "Publiée" : status === "hidden" ? "Masquée" : "Brouillon"; }

