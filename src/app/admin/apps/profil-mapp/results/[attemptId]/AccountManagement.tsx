"use client";

import { useActionState } from "react";
import { deleteTestMappResult, linkMappResult, type ResultActionState } from "../actions";

type Account = { id: string; label: string; email: string };
const initial: ResultActionState = { status: "idle", message: "" };

export default function AccountManagement({ attemptId, participantId, accounts, linkedLabel, canDeleteTest }: { attemptId: string; participantId: string; accounts: Account[]; linkedLabel: string | null; canDeleteTest: boolean }) {
  const [linkState, linkAction, linkPending] = useActionState(linkMappResult.bind(null, attemptId, participantId), initial);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteTestMappResult.bind(null, attemptId, participantId), initial);
  return <section className="mx-auto mb-8 max-w-6xl rounded-3xl border border-[#20302e]/10 bg-white p-5 shadow-sm sm:p-7">
    <div className="grid gap-6 lg:grid-cols-2">
      <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-muted">Compte Ministry School</p><h2 className="mt-2 font-title text-2xl">{linkedLabel ? "Compte rattaché" : "Rattacher ce résultat"}</h2>{linkedLabel ? <p className="mt-3 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">{linkedLabel}</p> : <form action={linkAction} className="mt-4 flex flex-col gap-3 sm:flex-row"><select name="userId" required defaultValue="" className="min-h-12 flex-1 rounded-xl border border-border bg-white px-3"><option value="" disabled>Rechercher par nom ou e-mail</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.label} · {account.email}</option>)}</select><button disabled={linkPending} className="min-h-12 rounded-xl bg-[#27302f] px-5 font-semibold text-white disabled:opacity-50">{linkPending ? "Rattachement…" : "Rattacher"}</button></form>}{linkState.message && <p role="status" className={`mt-3 text-sm ${linkState.status === "error" ? "text-red-700" : "text-emerald-800"}`}>{linkState.message}</p>}</div>
      {canDeleteTest && <div className="border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"><p className="text-xs font-semibold uppercase tracking-[.18em] text-red-700">Passage test</p><h2 className="mt-2 font-title text-2xl">Supprimer ce résultat test</h2><p className="mt-2 text-sm leading-6 text-muted">Supprime uniquement ce passage MAPP et ses réponses. Le compte Ministry School reste intact.</p><form action={deleteAction} className="mt-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirm" /> Je confirme la suppression</label><button disabled={deletePending} className="mt-3 min-h-11 rounded-xl border border-red-200 bg-red-50 px-4 font-semibold text-red-800 disabled:opacity-50">{deletePending ? "Suppression…" : "Supprimer le passage test"}</button></form>{deleteState.message && <p role="status" className={`mt-3 text-sm ${deleteState.status === "error" ? "text-red-700" : "text-emerald-800"}`}>{deleteState.message}</p>}</div>}
    </div>
  </section>;
}
