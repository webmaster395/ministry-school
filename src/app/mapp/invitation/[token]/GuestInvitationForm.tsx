"use client";

import { useState } from "react";

export default function GuestInvitationForm({ token }: { token: string }) {
  const [church, setChurch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch(`/api/mapp/invitations/${encodeURIComponent(token)}/start`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      gender: values.gender, firstName: values.firstName, lastName: values.lastName, email: values.email,
      belongsToChurch: church, churchName: values.churchName, consent: values.consent === "on",
    }) });
    const data = await response.json();
    if (!response.ok) { setBusy(false); setError(data.error ?? "Le test ne peut pas démarrer."); return; }
    window.location.assign(`/apps/profil-mapp/test/${data.attemptId}?invitation=1`);
  }
  return <form onSubmit={submit} className="mt-8 grid gap-5">
    <fieldset className="grid gap-3"><legend className="mb-2 text-sm font-semibold">Civilité</legend><div className="grid grid-cols-2 gap-3"><label className="rounded-2xl border p-4"><input required type="radio" name="gender" value="female" className="mr-2" />Femme</label><label className="rounded-2xl border p-4"><input required type="radio" name="gender" value="male" className="mr-2" />Homme</label></div></fieldset>
    <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Prénom<input required minLength={2} name="firstName" className="min-h-12 rounded-xl border px-4 font-normal" /></label><label className="grid gap-2 text-sm font-semibold">Nom<input required minLength={2} name="lastName" className="min-h-12 rounded-xl border px-4 font-normal" /></label></div>
    <label className="grid gap-2 text-sm font-semibold">Adresse e-mail<input required type="email" name="email" className="min-h-12 rounded-xl border px-4 font-normal" /></label>
    <fieldset><legend className="mb-3 text-sm font-semibold">Faites-vous partie d’une église ?</legend><div className="flex gap-4"><label><input type="radio" name="church" checked={church} onChange={() => setChurch(true)} /> Oui</label><label><input type="radio" name="church" checked={!church} onChange={() => setChurch(false)} /> Non</label></div></fieldset>
    {church && <label className="grid gap-2 text-sm font-semibold">Nom de votre église<input required name="churchName" className="min-h-12 rounded-xl border px-4 font-normal" /></label>}
    <label className="flex items-start gap-3 rounded-2xl bg-[#f7f4ef] p-4 text-sm leading-6"><input required type="checkbox" name="consent" className="mt-1" /><span>J’accepte que mes informations et mes réponses soient traitées pour calculer et conserver mon Profil MAPP. Je pourrai demander leur suppression.</span></label>
    {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
    <button disabled={busy} className="min-h-14 rounded-2xl bg-[#27302f] px-6 font-semibold text-white disabled:opacity-50">{busy ? "Préparation du test…" : "Commencer le test"}</button>
  </form>;
}
