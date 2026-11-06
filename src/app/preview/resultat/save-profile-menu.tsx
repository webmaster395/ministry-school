"use client";

import { Check, ChevronDown, Download, Link2, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import styles from "./result-preview.module.css";

export function SaveProfileMenu({ attemptId, revisionId, accessToken, isPreview }: { attemptId?: string; revisionId?: string; accessToken?: string; isPreview: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(accessToken && typeof window !== "undefined" ? window.location.href : "");
  const [busy] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, []);

  async function personalUrl() {
    if (url) return url;
    const current = window.location.href;
    setUrl(current);
    return current;
  }

  function pdf() {
    if (isPreview || !attemptId) {
      setStatus("La fenêtre d’impression permet d’enregistrer toute la restitution au format PDF.");
      window.dispatchEvent(new CustomEvent("mapp:print-profile"));
      return;
    }
    const query = revisionId ? `?revision=${encodeURIComponent(revisionId)}` : "";
    window.location.assign(`/api/apps/profil-mapp/results/${encodeURIComponent(attemptId)}/pdf${query}`);
  }

  async function share() {
    try {
      const link = await personalUrl();
      if (navigator.share) await navigator.share({ title: "Mes résultats Profil MAPP", text: "Voici mon profil MAPP.", url: link });
      else { await navigator.clipboard.writeText(link); setStatus("Lien personnel copié."); }
    } catch (cause) { if ((cause as DOMException)?.name !== "AbortError") setStatus(cause instanceof Error ? cause.message : "Partage impossible."); }
  }

  return <div className={styles.saveProfile} ref={root}>
    <button className={styles.saveProfileButton} type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => { setOpen(value => !value); setStatus(""); }}>
      <Link2 size={17} aria-hidden="true" /><span>Conserver mon profil</span><ChevronDown size={15} aria-hidden="true" />
    </button>
    {open && <div className={styles.saveProfileMenu} role="menu">
      <button role="menuitem" type="button" onClick={pdf}><Download size={18} /><span><strong>Télécharger en PDF</strong><small>Toute la restitution</small></span></button>
      <button role="menuitem" type="button" disabled={busy} onClick={() => void share()}><Share2 size={18} /><span><strong>Partager</strong><small>Lien personnel sécurisé</small></span></button>
      {status && <p role="status"><Check size={14} />{status}</p>}
    </div>}
  </div>;
}
