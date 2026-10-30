"use client";

import { ExternalLink, FileText, Link2, PackageOpen, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { addOpportunityResource, deleteOpportunityResource, updateOpportunityResource } from "@/app/etudiant/services/actions";
import AdminSelect from "@/components/admin/AdminSelect";
import type { OpportunityResource } from "@/lib/data/opportunity-resources";

const LABEL = { support: "Support de cours", resource: "Ressource", link: "Lien" } as const;
const ICON = { support: FileText, resource: PackageOpen, link: Link2 } as const;
const TYPE_OPTIONS = (Object.entries(LABEL) as [OpportunityResource["kind"], string][]).map(([value, label]) => ({ value, label }));
const field = "min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10";
const fileField = "block w-full rounded-xl border border-dashed border-border bg-background p-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-2 file:text-xs file:font-semibold file:text-on-accent";

function DescriptionField({ defaultValue = "" }: { defaultValue?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = () => {
    const textarea = ref.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(72, textarea.scrollHeight)}px`;
  };
  useEffect(() => {
    const textarea = ref.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(72, textarea.scrollHeight)}px`;
  }, [defaultValue]);
  return <textarea ref={ref} name="description" rows={2} maxLength={2000} defaultValue={defaultValue} onInput={resize} className={`${field} resize-none py-3 leading-6`} placeholder="Expliquez en quelques phrases à quoi sert ce contenu…" />;
}

function ResourceFields({ opportunityId, resource, onCancel }: { opportunityId: string; resource?: OpportunityResource; onCancel?: () => void }) {
  const [kind, setKind] = useState<OpportunityResource["kind"]>(resource?.kind ?? "support");
  const editing = Boolean(resource);
  return <form action={editing ? updateOpportunityResource : addOpportunityResource} encType="multipart/form-data" className="grid min-w-0 gap-3.5">
    <input type="hidden" name="opportunity_id" value={opportunityId} />
    {resource && <input type="hidden" name="resource_id" value={resource.id} />}

    <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,.54fr)_minmax(0,1fr)]">
      <label className="min-w-0"><span className="mb-1.5 block text-sm font-medium">Type de contenu</span><AdminSelect name="kind" value={kind} onValueChange={(value) => setKind(value as OpportunityResource["kind"])} options={TYPE_OPTIONS} ariaLabel="Type de contenu" /></label>
      <label className="min-w-0"><span className="mb-1.5 block text-sm font-medium">Nom</span><input name="title" required maxLength={180} defaultValue={resource?.title ?? ""} className={field} placeholder={kind === "link" ? "Ex. Créer ton compte ChatGPT" : "Nom du contenu"} /></label>
    </div>

    <label className="min-w-0"><span className="mb-1.5 block text-sm font-medium">Description <span className="font-normal text-muted">(facultatif)</span></span><DescriptionField defaultValue={resource?.description ?? ""} /></label>

    {kind === "link" ? <label className="min-w-0"><span className="mb-1.5 block text-sm font-medium">Adresse du lien</span><input type="url" name="external_url" required defaultValue={resource?.kind === "link" ? resource.external_url ?? "" : ""} className={field} placeholder="https://…" /></label> : <label className="min-w-0"><span className="mb-1.5 block text-sm font-medium">Fichier{editing && resource?.file_path ? <span className="font-normal text-muted"> · conserver ou remplacer</span> : ""}</span><input type="file" name="file" required={!editing || !resource?.file_path} className={fileField} /><small className="mt-1.5 block text-muted">{resource?.file_name ? `Fichier actuel : ${resource.file_name} · ` : ""}PDF, Word, PowerPoint, Excel, image, texte ou ZIP · 25 Mo maximum</small></label>}

    <div className="flex flex-wrap justify-end gap-2 pt-0.5">
      {onCancel && <button type="button" onClick={onCancel} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:border-foreground"><X size={15} /> Annuler</button>}
      <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-on-accent"><Plus size={16} /> {editing ? "Enregistrer" : "Ajouter"}</button>
    </div>
  </form>;
}

export default function OpportunityResourcesEditor({ opportunityId, resources }: { opportunityId: string; resources: OpportunityResource[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  return <section className="rounded-3xl border border-border bg-background p-5 sm:p-7">
    <div><h2 className="font-title text-[22px]">Supports et ressources <span className="font-sans text-sm font-normal text-muted">(facultatif)</span></h2><p className="mt-1 text-sm text-muted">Ajoutez des documents ou des liens utiles. Leur description apparaîtra sur la fiche étudiante lorsqu’elle est renseignée.</p></div>

    {resources.length > 0 && <ul className="mt-5 divide-y divide-border-soft rounded-2xl border border-border">{resources.map((resource) => { const Icon = ICON[resource.kind]; const editing = editingId === resource.id; return <li key={resource.id} className="p-3 sm:p-4">
      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface"><Icon size={17} /></span><div className="min-w-0"><p className="break-words text-sm font-semibold">{resource.title}</p>{resource.description && <p className="mt-1 whitespace-pre-line text-sm leading-5 text-muted">{resource.description}</p>}<p className="mt-1 text-xs text-muted">{LABEL[resource.kind]}{resource.file_name ? ` · ${resource.file_name}` : ""}</p></div><div className="col-span-2 flex justify-end gap-1 border-t border-border-soft pt-2 sm:col-span-1 sm:border-0 sm:pt-0"><a href={`/etudiant/services/${opportunityId}/ressources/${resource.id}/ouvrir`} target="_blank" rel="noreferrer" aria-label={`Ouvrir ${resource.title}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface hover:text-foreground"><ExternalLink size={16} /></a><button type="button" onClick={() => setEditingId(editing ? null : resource.id)} aria-label={`Modifier ${resource.title}`} aria-expanded={editing} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface hover:text-foreground"><Pencil size={16} /></button><form action={deleteOpportunityResource}><input type="hidden" name="opportunity_id" value={opportunityId} /><button name="resource_id" value={resource.id} aria-label={`Supprimer ${resource.title}`} className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-700"><Trash2 size={16} /></button></form></div></div>
      {editing && <div className="mt-4 border-t border-border-soft pt-4"><ResourceFields opportunityId={opportunityId} resource={resource} onCancel={() => setEditingId(null)} /></div>}
    </li>; })}</ul>}

    <details className="mt-5 rounded-2xl border border-border-soft bg-surface/45 p-4 open:bg-surface/60 sm:p-5"><summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold"><Plus size={16} /> Ajouter un contenu</summary><div className="mt-4 border-t border-border-soft pt-4"><ResourceFields opportunityId={opportunityId} /></div></details>
  </section>;
}
