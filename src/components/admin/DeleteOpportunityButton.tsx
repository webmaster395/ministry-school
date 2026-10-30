"use client";

import { Trash2 } from "lucide-react";
import { deleteOpportunity } from "@/app/etudiant/services/actions";

export default function DeleteOpportunityButton({ opportunityId, title }: { opportunityId: string; title: string }) {
  return <section className="rounded-2xl border border-red-200 bg-red-50/50 p-5">
    <h2 className="font-title text-[19px] text-foreground">Supprimer cet élément</h2>
    <p className="mt-1 text-sm leading-6 text-muted">Réservé aux administrateurs. La fiche, ses séances, ses inscriptions et ses notifications associées seront supprimées.</p>
    <form action={deleteOpportunity} onSubmit={(event) => { if (!window.confirm(`Supprimer définitivement « ${title} » ? Cette action est irréversible.`)) event.preventDefault(); }} className="mt-4">
      <input type="hidden" name="opportunity_id" value={opportunityId} />
      <button className="inline-flex items-center gap-2 rounded-full border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-800 hover:bg-red-50"><Trash2 size={16} /> Supprimer définitivement</button>
    </form>
  </section>;
}
