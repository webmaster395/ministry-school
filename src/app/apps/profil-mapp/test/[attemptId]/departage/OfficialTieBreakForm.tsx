"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

type Payload = { done: true } | { done: false; context: "natural" | "under_pressure"; rankScope: string; options: Array<{ dimension: string; text: string }>; question: string; sequence: number };

export function OfficialTieBreakForm({ attemptId, revisionId }: { attemptId: string; revisionId: string }) {
  const router = useRouter();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endpoint = `/api/mapp/hybrid-44/results/${revisionId}/tie-break`;
  const load = useCallback(async () => {
    const response = await fetch(endpoint, { cache: "no-store" });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error);
    if (value.done) { router.push(`/apps/profil-mapp/test/${attemptId}/resultat?revision=${revisionId}&native=1`); return; }
    setPayload(value);
  }, [attemptId, endpoint, revisionId, router]);
  useEffect(() => { void load().catch((cause) => setError(cause.message)); }, [load]);
  async function choose(dimension: string) {
    if (!payload || payload.done) return;
    setBusy(true); setError("");
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ selectedCode: dimension }) });
    const value = await response.json();
    if (!response.ok) { setError(value.error); setBusy(false); return; }
    if (value.done) router.push(`/apps/profil-mapp/test/${attemptId}/resultat?revision=${revisionId}&native=1`);
    else { setPayload(value); setBusy(false); }
  }
  if (error) return <main className="center-shell"><h1>Impossible de préciser le résultat</h1><p>{error}</p></main>;
  if (!payload || payload.done) return <main className="center-shell"><LoaderCircle className="spin" /><p>Préparation de ton résultat…</p></main>;
  return <main className="assessment-shell assessment-pages multi-question-pages disc-tie-break-shell"><header className="assessment-header"><div className="assessment-wordmark"><strong>Profil MAPP</strong><span>par l’Église MLK</span></div><span className="assessment-count">Question complémentaire</span></header><div className="page-progress disc-tie-progress" aria-hidden="true"><span /></div><section className="question-page disc-tie-break-card"><p className="simple-stage-title">{payload.context === "natural" ? "Profil naturel" : "Sous pression"}</p><h1>{payload.question}</h1><div className="tie-break-options">{payload.options.map((option) => <button key={option.dimension} disabled={busy} onClick={() => void choose(option.dimension)}><strong>{option.text}</strong></button>)}</div><p className="completion-hint">Cette réponse complète le calcul de cette version expérimentale.</p></section></main>;
}
