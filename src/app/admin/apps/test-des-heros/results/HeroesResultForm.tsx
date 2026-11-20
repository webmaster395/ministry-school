"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveHeroesResult, type HeroesResultFormState } from "../actions";
import type { HeroesAccount, HeroesAdminRow } from "@/lib/admin/heroes-motors";

const initialState: HeroesResultFormState = { error: null };

export default function HeroesResultForm({ row, accounts }: { row?: HeroesAdminRow; accounts: HeroesAccount[] }) {
  const [state, formAction, pending] = useActionState(saveHeroesResult, initialState);
  const [communication, setCommunication] = useState<"authorized" | "refused">(row?.communication === "refused" ? "refused" : "authorized");
  const authorized = communication === "authorized";

  return <div className="mb-7 rounded-2xl border border-border bg-background p-5 shadow-sm sm:p-6">
    <h2 className="font-title text-2xl">{row ? "Modifier le résultat" : "Ajouter un résultat"}</h2>
    <p className="mt-2 text-sm text-muted">Séparez les moteurs et les héros par une ligne, une virgule ou un point-virgule. Un héros minimum est nécessaire pour publier.</p>
    <form action={formAction} className="mt-5 grid gap-4">
      <input type="hidden" name="id" value={row?.id ?? ""} />
      {state.error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium leading-6 text-red-900">{state.error}</div> : null}
      <label className="grid gap-1 text-sm font-medium">Compte Ministry
        <select name="userId" defaultValue={row?.userId ?? ""} className="min-h-11 rounded-xl border border-border bg-white px-3">
          <option value="">Non attribué — brouillon uniquement</option>
          {accounts.map((account) => <option key={account.userId} value={account.userId}>{account.fullName} — {account.email}{account.deactivated ? " (désactivé)" : ""}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium">Prénom<input name="firstName" defaultValue={row?.firstName ?? ""} className="min-h-11 rounded-xl border border-border px-3" /></label>
      <label className="grid gap-1 text-sm font-medium">Portrait<textarea name="portrait" required={authorized} defaultValue={row?.portrait ?? ""} rows={10} className="rounded-xl border border-border p-3" /></label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">Moteurs<textarea name="motors" required={authorized} defaultValue={row?.motors.join("\n") ?? ""} rows={7} className="rounded-xl border border-border p-3" placeholder="Générosité&#10;Persévérance" /></label>
        <label className="grid gap-1 text-sm font-medium">Héros<textarea name="heroes" required={authorized} defaultValue={row?.heroes.join("\n") ?? ""} rows={7} className="rounded-xl border border-border p-3" placeholder="Joseph, Esther" /></label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">Communication
          <select name="communication" value={communication} onChange={(event) => setCommunication(event.target.value as "authorized" | "refused")} className="min-h-11 rounded-xl border border-border bg-white px-3">
            <option value="authorized">Autorisée</option>
            <option value="refused">Refusée — réponses confidentielles</option>
          </select>
        </label>
        <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" name="visible" defaultChecked={row?.visible ?? true} /> Publier et rendre visible sur le profil</label>
      </div>
      {row?.userId ? <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirmReassignment" /> Je confirme tout changement d&apos;attribution</label> : null}
      <div className="flex gap-3">
        <button disabled={pending} className="rounded-xl bg-[#27302f] px-5 py-3 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60">{pending ? "Enregistrement…" : "Enregistrer"}</button>
        {row ? <Link href="/admin/apps/test-des-heros/results" className="rounded-xl border border-border px-5 py-3 text-sm">Annuler</Link> : null}
      </div>
    </form>
  </div>;
}
