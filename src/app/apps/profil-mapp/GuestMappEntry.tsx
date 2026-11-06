"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";

export function GuestMappEntry() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/mapp/guest/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Démarrage impossible.");
      window.location.assign(`/apps/profil-mapp/test/${payload.attemptId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Démarrage impossible.");
      setBusy(false);
    }
  }

  return <main className="entry-experience entry-landing">
    <header className="landing-header"><div className="entry-signature"><b className="mapp-wordmark"><span>Profil</span> mapp<i>.</i></b><span className="signature-separator"/><span>Église MLK</span></div></header>
    <section className="landing-hero">
      <p className="entry-kicker">Proposé par l’Église MLK</p>
      <h1>Découvre comment tu fonctionnes.</h1>
      <p className="landing-lead">44 questions pour explorer ta manière de penser, d’agir et d’interagir avec les autres.</p>
      <form className="entry-form" onSubmit={start}>
        <div className="entry-form-heading"><strong>Avant de commencer</strong><small>Ton adresse permet de rattacher ultérieurement ce résultat à ton compte Ministry. Elle ne permet jamais, à elle seule, d’ouvrir ta tentative.</small></div>
        <label>Prénom<input type="text" required minLength={2} maxLength={80} autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label>
        <label>Nom<input type="text" required minLength={2} maxLength={80} autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} /></label>
        <label>Adresse e-mail Ministry School<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button entry-start" disabled={busy}>{busy ? <><LoaderCircle className="spin"/> Préparation…</> : <>Commencer le test <ArrowRight size={18}/></>}</button>
        <p className="entry-privacy">Aucun mot de passe ni e-mail de connexion ne sera demandé. Un secret de reprise est conservé uniquement dans un cookie sécurisé.</p>
      </form>
    </section>
  </main>;
}

