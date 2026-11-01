"use client";
/* eslint-disable @next/next/no-img-element -- icônes administrées et aperçus blob à domaine dynamique */

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, ImageIcon, Save, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { CatalogApp } from "@/lib/apps/catalog";
import { toParisDateTimeLocal } from "@/lib/apps/publication";
import { deleteCatalogApp, saveCatalogApp } from "@/app/admin/apps/actions";

export default function AppSettingsForm({ app, returnTo, cancelHref = "/admin/apps" }: { app?: CatalogApp; returnTo?: string; cancelHref?: string }) {
  const searchParams = useSearchParams();
  const [name, setName] = useState(app?.name ?? "");
  const [category, setCategory] = useState(app?.category ?? "");
  const [preview, setPreview] = useState(app?.iconUrl ?? null);
  const scheduledAt = app?.publicPublishAt ?? app?.studentPublishAt ?? null;
  const [publicationMode, setPublicationMode] = useState(scheduledAt ? "scheduled" : "immediate");
  const [dirty, setDirty] = useState(false);
  const saved = searchParams.get("saved") === "1";
  const selectedStatus = app?.status === "scheduled" ? "published" : app?.status ?? "draft";
  return <div className="space-y-6">
    <form action={saveCatalogApp} onChange={() => setDirty(true)} className="space-y-5">
      <input type="hidden" name="id" value={app?.id ?? ""} /><input type="hidden" name="slug" value={app?.slug ?? ""} /><input type="hidden" name="currentIcon" value={app?.iconUrl ?? ""} /><input type="hidden" name="integrationKey" value={app?.integrationKey ?? ""} /><input type="hidden" name="order" value={app?.order ?? 0} />{returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <Preview name={name} icon={preview} />
      <FormSection title="Identité de l’outil">
        <div className="grid gap-5 md:grid-cols-2"><Field label="Nom"><input name="name" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></Field><Field label="Catégorie"><input name="category" required maxLength={80} value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Finance, Identité…" /></Field><Field label="Description courte" className="md:col-span-2"><textarea name="description" rows={3} maxLength={240} defaultValue={app?.description} /></Field><IconInput preview={preview} setPreview={setPreview} /></div>
      </FormSection>
      <FormSection title="Accès">
        <div className="grid gap-3"><Field label="URL de destination"><input name="url" type="url" required defaultValue={app?.destinationUrl} placeholder="https://…" /></Field>{app?.url && <a href={app.url} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-2 text-xs font-medium text-link hover:underline">Tester l’outil <ExternalLink size={13} /></a>}</div>
      </FormSection>
      <FormSection title="Publication">
        <div className="grid gap-5 md:grid-cols-2"><Field label="Statut de l’outil"><select name="status" defaultValue={selectedStatus}><option value="draft">Brouillon</option><option value="published">Publié</option><option value="disabled">Désactivé</option></select></Field><Field label="Publication"><select name="publicationMode" value={publicationMode} onChange={(event) => setPublicationMode(event.target.value)}><option value="immediate">Immédiate</option><option value="scheduled">Programmée</option></select></Field>{publicationMode === "scheduled" && <Field label="Date et heure — Europe/Paris" className="md:col-span-2"><input name="publicationDateTime" required type="datetime-local" defaultValue={toParisDateTimeLocal(scheduledAt)} /></Field>}</div>
      </FormSection>
      <FormSection title="Visibilité">
        <div className="grid gap-3 md:grid-cols-2"><Visibility name="publicEnabled" title="Visible sur le portail public" description="Affiché sur /apps sans connexion." checked={app?.publicEnabled ?? false} /><Visibility name="studentEnabled" title="Visible dans « Mes outils »" description="Soumis aussi au réglage global de l’espace étudiant." checked={app?.studentEnabled ?? false} /></div>
      </FormSection>
      <div className="sticky bottom-3 z-20 flex flex-col gap-2 rounded-2xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center"><p className="min-h-5 flex-1 text-xs" aria-live="polite">{dirty ? <span className="text-[#9a642a]">Modifications non enregistrées</span> : saved ? <span className="text-[#28634f]">Modifications enregistrées</span> : null}</p><Link href={cancelHref} className="inline-flex min-h-10 items-center justify-center rounded-full border border-border px-4 text-xs font-semibold">Annuler</Link><button type="submit" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-xs font-semibold text-on-accent"><Save size={14} /> Enregistrer</button></div>
    </form>
    {app && <section className="rounded-2xl border border-[#b34a36]/25 bg-background p-5"><h2 className="font-title text-xl font-normal text-[#8c3426]">Zone de danger</h2><p className="mt-1 text-xs leading-5 text-muted">L’outil sera retiré du catalogue. Son code, ses données, ses résultats et son projet technique seront conservés.</p><form action={deleteCatalogApp} className="mt-4" onSubmit={(event) => { if (!window.confirm(`Supprimer « ${app.name} » du catalogue ? Les données et résultats seront conservés.`)) event.preventDefault(); }}><input type="hidden" name="id" value={app.id} /><button type="submit" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#b34a36]/35 px-4 text-xs font-semibold text-[#9f3d2d]"><Trash2 size={14} /> Supprimer cet outil</button></form></section>}
  </div>;
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-border bg-background p-5 sm:p-6"><h2 className="mb-5 font-title text-xl font-normal">{title}</h2>{children}</section>; }
function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) { return <label className={`grid gap-2 text-xs font-medium ${className}`}>{label}<span className="contents [&_input]:min-h-11 [&_input]:rounded-xl [&_input]:border [&_input]:border-border [&_input]:bg-background [&_input]:px-3 [&_select]:min-h-11 [&_select]:rounded-xl [&_select]:border [&_select]:border-border [&_select]:bg-background [&_select]:px-3 [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-border [&_textarea]:bg-background [&_textarea]:px-3 [&_textarea]:py-3">{children}</span></label>; }
function Visibility({ name, title, description, checked }: { name: string; title: string; description: string; checked: boolean }) { return <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border-soft bg-surface p-4"><input className="mt-1 h-4 w-4 accent-foreground" name={name} type="checkbox" defaultChecked={checked} /><span><strong className="block text-sm font-medium">{title}</strong><span className="mt-1 block text-xs leading-5 text-muted">{description}</span></span></label>; }
function IconInput({ preview, setPreview }: { preview: string | null; setPreview: (value: string) => void }) { return <Field label="Icône" className="md:col-span-2"><span className="flex flex-col gap-4 rounded-xl border border-border p-4 sm:flex-row sm:items-center">{preview ? <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface"><img src={preview} alt="Aperçu de l’icône" className="h-full w-full object-contain" /></span> : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-surface text-muted"><ImageIcon size={21} /></span>}<input name="icon" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => { const file = event.target.files?.[0]; if (file) setPreview(URL.createObjectURL(file)); }} /></span></Field>; }
function Preview({ name, icon }: { name: string; icon: string | null }) { return <section className="flex items-center gap-3 rounded-2xl bg-foreground p-4 text-on-accent"><span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/10">{icon ? <img src={icon} alt="" className="h-full w-full object-contain" /> : <span className="font-title text-xl">{name.slice(0, 1) || "+"}</span>}</span><div className="min-w-0"><p className="label text-[8px] text-white/50">APERÇU LAUNCHPAD</p><h2 className="mt-1 truncate font-title text-xl font-normal">{name || "Nouvel outil"}</h2></div></section>; }
