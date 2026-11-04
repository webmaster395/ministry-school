"use client";

import { useState } from "react";
import { Copy, Link2 } from "lucide-react";

export default function SkillReviewLink({ skills }: { skills: string[] }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const create = async () => { setBusy(true); setError(""); const response = await fetch("/api/apps/grace-identity/reviews", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ skills }) }); const data = await response.json().catch(() => ({})); setBusy(false); if (!response.ok) { setError(data.error ?? "Création impossible."); return; } setUrl(`${window.location.origin}${data.url}`); };
  return <section className="rounded-2xl border border-border bg-background p-5"><h2 className="font-title text-xl">Le regard d’une autre personne</h2><p className="mt-2 text-sm leading-6 text-muted">Générez un lien personnel, valable trente jours. La personne invitée ne verra que votre sélection de compétences.</p>{url ? <div className="mt-4 flex flex-col gap-2 sm:flex-row"><input readOnly value={url} className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 text-sm" /><button type="button" onClick={() => void navigator.clipboard.writeText(url)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border px-4 text-sm"><Copy size={15} /> Copier</button></div> : <button type="button" disabled={busy} onClick={create} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground px-4 text-sm text-on-accent disabled:opacity-50"><Link2 size={16} />{busy ? "Création…" : "Créer un lien d’évaluation"}</button>}{error && <p className="mt-2 text-xs text-red-700">{error}</p>}</section>;
}
