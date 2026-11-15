"use client";

import { Check, ChevronDown, Copy, Download, Link2, UserPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import styles from "./result-preview.module.css";

type Invitation = { id: string; status: "created" | "started" | "completed"; guestName?: string | null; guestEmail?: string | null };
export function SaveProfileMenu({ attemptId, revisionId, accessToken, isPreview, canInvite = true }: { attemptId?: string; revisionId?: string; accessToken?: string; isPreview: boolean; canInvite?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  void accessToken;
  const [busy] = useState(false);
  const [status, setStatus] = useState("");
  const [inviting, setInviting] = useState(false);
  const [remaining, setRemaining] = useState(3);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [createdUrl, setCreatedUrl] = useState("");
  const [showInvitations, setShowInvitations] = useState(false);

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, []);

  function pdf() {
    if (isPreview || !attemptId) {
      setStatus("La fenêtre d’impression permet d’enregistrer toute la restitution au format PDF.");
      window.dispatchEvent(new CustomEvent("mapp:print-profile"));
      return;
    }
    const query = revisionId ? `?revision=${encodeURIComponent(revisionId)}` : "";
    window.location.assign(`/api/apps/profil-mapp/results/${encodeURIComponent(attemptId)}/pdf${query}`);
  }

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

  return <div className={styles.saveProfile} ref={root}>
    <button className={styles.saveProfileButton} type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => { setOpen(value => !value); setStatus(""); }}>
      <Link2 size={17} aria-hidden="true" /><span>Conserver mon profil</span><ChevronDown size={15} aria-hidden="true" />
    </button>
    {open && <div className={styles.saveProfileMenu} role="menu">
      <button role="menuitem" type="button" onClick={pdf}><Download size={18} /><span><strong>Télécharger en PDF</strong><small>Toute la restitution</small></span></button>
      {canInvite && !isPreview && <button role="menuitem" type="button" disabled={busy || inviting} onClick={() => { setOpen(false); void loadInvitations(); setCreatedUrl(""); }}><UserPlus size={18} /><span><strong>Inviter à faire le test</strong><small>3 invitations personnelles maximum</small></span></button>}
      {status && <p role="status"><Check size={14} />{status}</p>}
    </div>}
    {canInvite && !isPreview && showInvitations && <div className={styles.invitationPanel} role="dialog" aria-label="Invitations Profil MAPP">
      <div><strong>Inviter à faire le test</strong><button type="button" aria-label="Fermer" onClick={() => setShowInvitations(false)}>×</button></div>
      <p><b>{remaining}</b> invitation{remaining > 1 ? "s" : ""} restante{remaining > 1 ? "s" : ""}</p>
      {createdUrl && <button type="button" onClick={() => void navigator.clipboard.writeText(createdUrl)}><Copy size={16} /> Copier le nouveau lien</button>}
      {remaining > 0 && <button type="button" disabled={inviting} onClick={() => void createInvitation()}>{inviting ? "Création…" : "Générer une invitation"}</button>}
      {invitations.length > 0 && <ul>{invitations.map((invitation) => <li key={invitation.id}><span>{invitation.guestName || invitation.guestEmail || "Invitation créée"}</span><b>{invitation.status === "completed" ? "Test terminé" : invitation.status === "started" ? "Test commencé" : "Lien créé"}</b></li>)}</ul>}
    </div>}
  </div>;
}
