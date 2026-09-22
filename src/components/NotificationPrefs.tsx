"use client";

import { useState, useTransition } from "react";
import { updateNotificationPrefs } from "@/app/etudiant/profil/actions";
import { NOTIFICATION_LABELS, type NotificationPrefs } from "@/lib/notification-prefs";

/**
 * Bascules de notifications, enregistrées une par une dès qu'on les touche (pas de bouton
 * « Enregistrer »). Ce sont des préférences : elles ne déclenchent pas encore de vraie
 * notification sur le téléphone tant que l'application n'est pas installée et que l'envoi
 * technique (push) n'est pas branché.
 */
export default function NotificationPrefs({ initial }: { initial: NotificationPrefs }) {
  const [prefs, setPrefs] = useState(initial);
  const [, startTransition] = useTransition();

  function toggle(key: keyof NotificationPrefs) {
    const next = !prefs[key];
    setPrefs((p) => ({ ...p, [key]: next }));
    startTransition(async () => {
      try {
        await updateNotificationPrefs(key, next);
      } catch {
        setPrefs((p) => ({ ...p, [key]: !next }));
      }
    });
  }

  return (
    <section className="rounded-lg border border-border bg-background p-5 sm:p-6">
      <h2 className="mb-1 label text-xs tracking-[0.18em] text-muted">NOTIFICATIONS</h2>
      <p className="mb-4 text-sm text-muted">
        Si vous avez installé Ministry School sur votre téléphone, choisissez ce qui doit vous être signalé.
      </p>
      <ul className="divide-y divide-border">
        {(Object.keys(NOTIFICATION_LABELS) as (keyof NotificationPrefs)[]).map((key) => {
          const info = NOTIFICATION_LABELS[key];
          const checked = prefs[key];
          return (
            <li key={key} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{info.label}</p>
                <p className="text-xs text-muted">{info.hint}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={info.label}
                onClick={() => toggle(key)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                  checked ? "bg-accent" : "bg-border"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition ${
                    checked ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
