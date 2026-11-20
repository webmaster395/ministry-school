"use client";

import { useActionState, useState } from "react";
import { Check, Loader2, PencilLine } from "lucide-react";
import { updateMemberProfile, type MemberActionResult } from "@/app/gestion/admin/actions";

export default function MemberProfileEditor({ member, ministries }: {
  member: { id: string; full_name: string; gender: string | null; ministry_id: string | null; preferred_day: string | null };
  ministries: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<MemberActionResult, FormData>(updateMemberProfile, {});
  const [dirty, setDirty] = useState(false);
  return (
    <details className="rounded-xl border border-border bg-background p-5 sm:p-6">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span><span className="label text-[10px] tracking-[0.15em] text-muted">FICHE ÉTUDIANT</span><strong className="mt-1 flex items-center gap-2 text-base text-foreground"><PencilLine size={17} /> Modifier les informations</strong></span>
        <span className="text-xs text-link">Ouvrir</span>
      </summary>
      <form action={(formData) => { setDirty(false); action(formData); }} onChange={() => setDirty(true)} className="mt-5 grid gap-4 border-t border-border-soft pt-5 sm:grid-cols-2">
        <input type="hidden" name="user_id" value={member.id} />
        <label className="text-xs font-semibold text-foreground">Nom et prénom
          <input name="full_name" required defaultValue={member.full_name} className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm font-normal" />
        </label>
        <label className="text-xs font-semibold text-foreground">Genre
          <select name="gender" defaultValue={member.gender ?? ""} className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm font-normal">
            <option value="">Non renseigné</option><option value="femme">Femme</option><option value="homme">Homme</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-foreground">Sensibilité ministérielle
          <select name="ministry_id" defaultValue={member.ministry_id ?? ""} className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm font-normal">
            <option value="">Aucune</option>{ministries.map((ministry) => <option key={ministry.id} value={ministry.id}>{ministry.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-foreground">Journée préférée
          <input name="preferred_day" defaultValue={member.preferred_day ?? ""} placeholder="Ex. samedi" className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm font-normal" />
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-on-accent disabled:opacity-60">
            {pending ? <><Loader2 size={16} className="animate-spin" /> Enregistrement…</> : state.success && !dirty ? <><Check size={16} /> Enregistré</> : "Enregistrer la fiche"}
          </button>
          <span aria-live="polite" className={`text-xs font-semibold ${state.error ? "text-rose-700" : dirty ? "text-amber-700" : state.success ? "text-emerald-700" : "text-muted"}`}>
            {state.error ?? (dirty ? "Modifications non enregistrées" : state.success ? "Les informations sont à jour." : "Aucune modification en attente")}
          </span>
        </div>
      </form>
    </details>
  );
}
