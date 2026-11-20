"use client";

import { useId, useRef, useState } from "react";
import { Check, X } from "lucide-react";

export default function OpportunityRegistrationButton({ prerequisites }: { prerequisites: string[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [confirmed, setConfirmed] = useState(false);
  const titleId = useId();

  if (prerequisites.length === 0) {
    return <button className="w-full rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-on-accent sm:w-auto">M’inscrire</button>;
  }

  const close = () => {
    dialogRef.current?.close();
    setConfirmed(false);
  };

  return <>
    <button type="button" onClick={() => dialogRef.current?.showModal()} className="w-full rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-on-accent sm:w-auto">
      M’inscrire
    </button>
    <dialog ref={dialogRef} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); close(); }} className="m-auto w-[min(520px,calc(100%-32px))] rounded-3xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-[#17211e]/55">
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-muted">Avant de confirmer</p>
            <h2 id={titleId} className="mt-2 font-title text-[26px] leading-tight">As-tu bien les prérequis&nbsp;?</h2>
          </div>
          <button type="button" onClick={close} aria-label="Fermer" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border text-muted transition hover:text-foreground"><X size={18} /></button>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted">Pour profiter pleinement de cette proposition, vérifie que tu remplis les conditions suivantes.</p>
        <ul className="mt-5 space-y-3">
          {prerequisites.map((item) => <li key={item} className="flex items-start gap-3 rounded-2xl bg-surface px-4 py-3 text-sm leading-6"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-on-accent"><Check size={14} /></span><span>{item}</span></li>)}
        </ul>
        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-4">
          <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--accent)]" />
          <span className="text-sm font-medium leading-6">Je confirme remplir ces prérequis.</span>
        </label>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={close} className="rounded-full border border-border px-5 py-3 text-sm font-semibold">Annuler</button>
          <button type="submit" disabled={!confirmed} className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-on-accent disabled:cursor-not-allowed disabled:opacity-40">Confirmer mon inscription</button>
        </div>
      </div>
    </dialog>
  </>;
}
