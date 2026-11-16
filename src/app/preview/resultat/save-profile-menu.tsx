"use client";

import { Check, Copy, UserPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import styles from "./result-preview.module.css";

type Invitation = { id: string; status: "created" | "started" | "completed"; guestName?: string | null; guestEmail?: string | null };
export function SaveProfileMenu({ attemptId, revisionId, accessToken, isPreview, canInvite = true }: { attemptId?: string; revisionId?: string; accessToken?: string; isPreview: boolean; canInvite?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  void accessToken;
  const [status, setStatus] = useState("");
  const [inviting, setInviting] = useState(false);
  const [remaining, setRemaining] = useState(3);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [createdUrl, setCreatedUrl] = useState("");
  const [showInvitations, setShowInvitations] = useState(false);
  const pdfHref = attemptId ? `/api/apps/profil-mapp/results/${attemptId}/pdf${revisionId ? `?revision=${encodeURIComponent(revisionId)}` : ""}` : "";

  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setShowInvitations(false); };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, []);

  async function loadInvitations() {
    setShowInvitations(true);
    setInviting(true); setStatus("");
    const response = await fetch("/api/mapp/invitations", { cache: "no-store" });
    const data = await response.json();
    setInviting(false);
    if (!response.ok) { setStatus(data.error ?? "Invitations indisponibles."); return; }
    setRemaining(Number(data.remaining ?? 0)); setInvitations(data.invitations ?? []);
  }
  async function createInvitation() {
    setInviting(true); setStatus("");
    const response = await fetch("/api/mapp/invitations", { method: "POST" });
    const data = await response.json();
    setInviting(false);
    if (!response.ok) { setStatus(data.error ?? "Invitation impossible."); return; }
    setCreatedUrl(data.url); setRemaining(Number(data.remaining ?? Math.max(0, remaining - 1)));
    await navigator.clipboard.writeText(data.url);
    setStatus("Lien d’invitation copié.");
  }

  if (!canInvite || isPreview) return null;
  return <div className={styles.saveProfile} ref={root}>
    <button className={styles.saveProfileButton} type="button" aria-haspopup="dialog" aria-expanded={showInvitations} disabled={inviting} onClick={() => void loadInvitations()}>
      <UserPlus size={17} aria-hidden="true" /><span>Inviter à faire le test</span>
    </button>
    {showInvitations && <div className={styles.invitationPanel} role="dialog" aria-label="Invitations Profil MAPP">
      <div><strong>Inviter à faire le test</strong><button type="button" aria-label="Fermer" onClick={() => setShowInvitations(false)}>×</button></div>
      <p><b>{remaining}</b> invitation{remaining > 1 ? "s" : ""} restante{remaining > 1 ? "s" : ""}</p>
      {createdUrl && <button type="button" onClick={() => void navigator.clipboard.writeText(createdUrl)}><Copy size={16} /> Copier le nouveau lien</button>}
      {remaining > 0 && <button type="button" disabled={inviting} onClick={() => void createInvitation()}>{inviting ? "Création…" : "Générer une invitation"}</button>}
      {pdfHref && <a href={pdfHref}>Télécharger mon profil en PDF</a>}
      {status && <p role="status"><Check size={14} />{status}</p>}
      {invitations.length > 0 && <ul>{invitations.map((invitation) => <li key={invitation.id}><span>{invitation.guestName || invitation.guestEmail || "Invitation créée"}</span><b>{invitation.status === "completed" ? "Test terminé" : invitation.status === "started" ? "Test commencé" : "Lien créé"}</b></li>)}</ul>}
    </div>}
  </div>;
}
