"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Check, Copy, X } from "lucide-react";
import { markCalendarSynced } from "@/app/etudiant/actions";
import Portal from "@/components/Portal";

type Service = "apple" | "google";

const SERVICES: { key: Service; label: string }[] = [
  { key: "apple", label: "Apple Calendrier" },
  { key: "google", label: "Google Agenda" },
];

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-on-accent transition hover:bg-[#1b2221]";
const outlineButton =
  "inline-flex items-center justify-center gap-2 rounded-full border border-foreground bg-background px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-surface";

/**
 * Fenêtre « Synchroniser avec mon calendrier » : on choisit son application (Apple, Google,
 *  les étapes, avec le lien personnel à copier. C'est un abonnement : le
 * calendrier de la personne se met à jour tout seul quand un horaire ou une salle change.
 * « C'est fait » (ou la première lecture du lien par l'agenda) fait disparaître le bouton.
 */
export default function CalendarSyncDialog({
  open,
  onClose,
  subscribeUrl,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  subscribeUrl: string | null;
  /** Appelé quand la personne confirme « C'est fait » (le bouton Synchroniser disparaît ensuite). */
  onDone?: () => void;
}) {
  const [service, setService] = useState<Service>("apple");
  const [copied, setCopied] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    // Appareil et adresse du site ne sont connus qu'après le montage (évite un écart serveur/navigateur)
    const ua = navigator.userAgent;
    /* eslint-disable react-hooks/set-state-in-effect -- lus après le montage */
    setIsIos(/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    setService(/Android/i.test(ua) || /Windows/i.test(ua) ? "google" : "apple");
    setOrigin(window.location.origin);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [subscribeUrl]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const httpUrl = subscribeUrl ? `${origin}${subscribeUrl}` : "";
  // webcals:// = abonnement en connexion sécurisée (https). Avec webcal://, Apple tente d'abord http,
  // que le site refuse (il redirige vers https) : « connexion non sécurisée », puis échec.
  const webcalUrl = httpUrl.replace(/^https:\/\//, "webcals://").replace(/^http:\/\//, "webcal://");
  const services = SERVICES;

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(httpUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Presse-papier refusé : le lien reste copiable depuis la page d'aide de l'application
    }
  }

  const personalLink = (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
      <div className="min-w-0">
        <b className="block text-sm text-foreground">Votre lien personnel de calendrier</b>
        <span className="block truncate text-xs text-muted">{origin.replace(/^https?:\/\//, "")}/agenda/••••••••</span>
      </div>
      <button type="button" onClick={copyUrl} className={`${primaryButton} shrink-0 !px-4 !py-2`}>
        <Copy size={15} /> {copied ? "Lien copié" : "Copier"}
      </button>
    </div>
  );

  const steps = (items: string[]) => (
    <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ol>
  );

  return (
    <Portal>
    <div
      className="app-modal-layer fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ajouter les formations à mon calendrier"
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-full w-full max-w-[540px] space-y-5 overflow-y-auto rounded-t-2xl bg-background p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)] sm:rounded-2xl sm:p-7"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-4 top-4 rounded-md p-1 text-muted transition hover:bg-foreground/[0.06] hover:text-foreground"
        >
          <X size={18} />
        </button>

        <header className="pr-6">
          <h2 className="font-title text-[20px] leading-tight text-foreground">
            Ajouter les formations à mon calendrier
          </h2>
          <p className="mt-1.5 text-sm text-muted">
            Choisissez le calendrier que vous utilisez. Les modifications d&apos;horaires et de lieux
            pourront ensuite être mises à jour automatiquement.
          </p>
        </header>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Application de calendrier">
          {services.map((s) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={service === s.key}
              onClick={() => setService(s.key)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                service === s.key
                  ? "border-foreground bg-accent font-medium text-on-accent"
                  : "border-border text-foreground hover:border-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {service === "apple" && (
            <>
              {steps(
                isIos
                  ? [
                      "Appuyez sur le bouton ci-dessous.",
                      "Une fenêtre s'ouvre : appuyez sur « S'abonner », puis sur « Ajouter ».",
                      "Les formations apparaissent dans l'application Calendrier, sous « Ministry School ».",
                    ]
                  : [
                      "Cliquez sur le bouton ci-dessous.",
                      "Dans l'application Calendrier, confirmez l'abonnement.",
                      "Choisissez la fréquence d'actualisation puis validez.",
                    ]
              )}
              {personalLink}
              <a href={webcalUrl} className={`${primaryButton} w-full`}>
                <CalendarDays size={16} /> Ajouter à Apple Calendrier
              </a>
            </>
          )}

          {service === "google" && (
            <>
              {steps([
                "Copiez votre lien personnel avec le bouton ci-dessous.",
                "Sur un ordinateur, ouvrez Google Agenda : « Autres agendas » (à gauche), puis le « + », puis « À partir de l'URL ».",
                "Collez le lien, puis cliquez sur « Ajouter l'agenda ».",
                "Sur votre téléphone Android, l'agenda apparaît tout seul dans l'application Google Agenda (même compte Google), parfois après quelques minutes.",
              ])}
              <p className="text-xs text-muted">
                L&apos;application Google Agenda du téléphone ne permet pas d&apos;ajouter un lien : il faut passer par un
                ordinateur, une seule fois.
              </p>
              {personalLink}
              <a
                href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl"
                target="_blank"
                rel="noreferrer"
                className={`${outlineButton} w-full`}
              >
                <CalendarDays size={16} /> Ouvrir Google Agenda
              </a>
            </>
          )}
        </div>

        <small className="block text-xs text-muted">
          Le lien reste personnel et sécurisé : ne le partagez pas. Ensuite, un changement d&apos;horaire ou de salle
          est repris automatiquement par votre agenda (Google : sous 24 h environ, Apple : souvent en quelques heures).
        </small>

        {onDone && (
          <button
            type="button"
            onClick={async () => {
              await markCalendarSynced();
              onDone();
            }}
            className={`${outlineButton} w-full`}
          >
            <Check size={16} /> C&apos;est fait, je l&apos;ai ajouté
          </button>
        )}
      </div>
    </div>
    </Portal>
  );
}
