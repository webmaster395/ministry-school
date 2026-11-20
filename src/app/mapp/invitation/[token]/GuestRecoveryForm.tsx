"use client";

import { useState } from "react";

export default function GuestRecoveryForm({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function recover(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch(`/api/mapp/invitations/${encodeURIComponent(token)}/recover`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: values.email, recoveryCode: values.recoveryCode }),
    });
    const data = await response.json();
    if (!response.ok) {
      setBusy(false);
      setError(data.error ?? "Résultat introuvable.");
      return;
    }
    const destination = data.status === "completed"
      ? `/apps/profil-mapp/test/${data.attemptId}/resultat?invitation=1`
      : `/apps/profil-mapp/test/${data.attemptId}?invitation=1`;
    window.location.assign(destination);
  }

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="mt-5 min-h-12 rounded-xl border border-black/15 bg-white px-5 text-sm font-semibold">Retrouver mon test</button>;
  }

  return <form onSubmit={recover} className="mt-5 grid gap-4 text-left">
    <label className="grid gap-2 text-sm font-semibold">Adresse e-mail<input required type="email" name="email" className="min-h-12 rounded-xl border px-4 font-normal" /></label>
    <label className="grid gap-2 text-sm font-semibold">Code de récupération<input required name="recoveryCode" autoCapitalize="characters" className="min-h-12 rounded-xl border px-4 font-mono font-normal uppercase" placeholder="XXXX-XXXX-XXXX" /></label>
    {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
    <button disabled={busy} className="min-h-12 rounded-xl bg-[#27302f] px-5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Vérification…" : "Ouvrir mon test"}</button>
  </form>;
}
