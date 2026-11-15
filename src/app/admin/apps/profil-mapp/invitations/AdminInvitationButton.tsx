"use client";

import { useState } from "react";

export default function AdminInvitationButton() {
  const [url, setUrl] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function create() {
    setBusy(true); setError("");
    const response = await fetch("/api/admin/mapp/invitations", { method: "POST" });
    const data = await response.json(); setBusy(false);
    if (!response.ok) { setError(data.error ?? "Création impossible."); return; }
    setUrl(data.url); await navigator.clipboard.writeText(data.url);
  }
  return <div className="flex flex-wrap items-center gap-3"><button onClick={() => void create()} disabled={busy} className="rounded-xl bg-[#27302f] px-4 py-2.5 text-sm font-semibold text-white">{busy ? "Création…" : "Créer un lien administrateur"}</button>{url && <button onClick={() => void navigator.clipboard.writeText(url)} className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold">Copier le lien</button>}{error && <span className="text-sm text-red-700">{error}</span>}</div>;
}
