"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/* ─── Types ─── */
type Platform = "chrome" | "ios" | "unsupported";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/* ─── Helpers ─── */
function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unsupported";
  const ua = navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/chrome/i.test(ua);
  if (isIos && isSafari) return "ios";
  // Chrome, Edge, Samsung Browser, Opera — tous supportent beforeinstallprompt
  if (
    /chrome|crios|opr|edg|samsung/i.test(ua) ||
    "BeforeInstallPromptEvent" in window
  )
    return "chrome";
  return "unsupported";
}

const DISMISSED_KEY = "ms-pwa-dismissed";

/* ─── Component ─── */
export default function InstallBanner() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform>("unsupported");
  const [showIosSteps, setShowIosSteps] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Ne pas afficher si déjà installé ou refusé récemment
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      localStorage.getItem(DISMISSED_KEY)
    )
      return;

    const p = detectPlatform();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- détecté après le montage pour éviter un écart serveur/navigateur
    setPlatform(p);

    if (p === "ios") {
      // Petit délai pour ne pas envahir immédiatement
      const t = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(t);
    }

    if (p === "chrome") {
      const handler = (e: Event) => {
        e.preventDefault();
        deferredPrompt.current = e as BeforeInstallPromptEvent;
        setVisible(true);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  async function install() {
    if (!deferredPrompt.current) return;
    await deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    } else {
      dismiss();
    }
    deferredPrompt.current = null;
  }

  // Proposée uniquement sur la page de connexion, jamais sur la landing publique ni dans l'espace connecté
  if (!visible || pathname !== "/login") return null;

  /* ── iOS : instructions guidées ── */
  if (platform === "ios") {
    return (
      <div
        role="dialog"
        aria-label="Installer l'application"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          padding: "0 16px 16px",
          animation: "ms-banner-up 420ms cubic-bezier(0.22,1,0.36,1) both",
        }}
      >
        <style>{`
          @keyframes ms-banner-up {
            from { opacity: 0; transform: translateY(24px); }
            to   { opacity: 1; transform: none; }
          }
        `}</style>

        <div
          style={{
            background: "#27302f",
            color: "#fbeeda",
            borderRadius: 16,
            padding: "20px 20px 20px",
            boxShadow: "0 8px 40px -8px rgba(0,0,0,.55)",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {/* En-tête */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/icon-192.png"
                alt=""
                width={44}
                height={44}
                style={{ borderRadius: 10, flexShrink: 0 }}
              />
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem", lineHeight: 1.2 }}>
                  Installer Ministry School
                </p>
                <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.65, marginTop: 2 }}>
                  Accès rapide depuis votre écran d&apos;accueil
                </p>
              </div>
            </div>
            <button
              onClick={dismiss}
              aria-label="Fermer"
              style={{
                background: "rgba(251,238,218,.12)",
                border: "none",
                borderRadius: 8,
                color: "#fbeeda",
                cursor: "pointer",
                fontSize: "1rem",
                padding: "6px 10px",
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>

          {/* Bouton pour afficher les étapes */}
          {!showIosSteps ? (
            <button
              onClick={() => setShowIosSteps(true)}
              style={{
                background: "#fbeeda",
                color: "#27302f",
                border: "none",
                borderRadius: 10,
                padding: "12px 20px",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              Comment installer →
            </button>
          ) : (
            /* Étapes iOS */
            <ol
              style={{
                margin: 0,
                paddingLeft: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {[
                { icon: "⎋", label: "Appuyez sur le bouton Partager en bas de Safari" },
                { icon: "＋", label: "Faites défiler et choisissez « Sur l'écran d'accueil »" },
                { icon: "✓", label: "Appuyez sur « Ajouter » en haut à droite" },
              ].map(({ icon, label }, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    fontSize: "0.85rem",
                    opacity: 0.9,
                  }}
                >
                  <span
                    style={{
                      background: "rgba(251,238,218,.15)",
                      borderRadius: 8,
                      width: 32,
                      height: 32,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: "1rem",
                    }}
                  >
                    {icon}
                  </span>
                  <span style={{ lineHeight: 1.4, paddingTop: 6 }}>{label}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    );
  }

  /* ── Chrome / Edge / Android : dialogue natif ── */
  return (
    <div
      role="dialog"
      aria-label="Installer l'application"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: "0 16px 16px",
        animation: "ms-banner-up 420ms cubic-bezier(0.22,1,0.36,1) both",
      }}
    >
      <style>{`
        @keyframes ms-banner-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: none; }
        }
        @media (min-width: 640px) {
          .ms-install-banner { max-width: 420px; margin: 0 auto; }
        }
      `}</style>

      <div
        className="ms-install-banner"
        style={{
          background: "#27302f",
          color: "#fbeeda",
          borderRadius: 16,
          padding: "20px",
          boxShadow: "0 8px 40px -8px rgba(0,0,0,.55)",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        {/* Icône */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/icon-192.png"
          alt=""
          width={48}
          height={48}
          style={{ borderRadius: 10, flexShrink: 0 }}
        />

        {/* Texte */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem", lineHeight: 1.2 }}>
            Installer Ministry School
          </p>
          <p style={{ margin: "3px 0 0", fontSize: "0.8rem", opacity: 0.65 }}>
            Accès rapide depuis votre bureau
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            id="pwa-install-dismiss"
            onClick={dismiss}
            aria-label="Ne pas installer"
            style={{
              background: "rgba(251,238,218,.12)",
              border: "none",
              borderRadius: 8,
              color: "#fbeeda",
              cursor: "pointer",
              fontSize: "0.85rem",
              padding: "8px 12px",
              fontWeight: 500,
            }}
          >
            Plus tard
          </button>
          <button
            id="pwa-install-confirm"
            onClick={install}
            style={{
              background: "#fbeeda",
              color: "#27302f",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: "0.85rem",
              padding: "8px 14px",
              fontWeight: 700,
            }}
          >
            Installer
          </button>
        </div>
      </div>
    </div>
  );
}
