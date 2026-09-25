"use client";

import { useState, useTransition } from "react";
import { updateNotificationPrefs, updateReminderDays } from "@/app/etudiant/profil/actions";
import { NOTIFICATION_LABELS, type NotificationPrefs } from "@/lib/notification-prefs";

const KEYS = ["messages", "rappel_journee"] as const;

/**
 * Bascules de l'onglet Préférences (messages pédagogiques, rappels de formation) et moment du rappel.
 * Chaque réglage est enregistré dès qu'on le touche, sans bouton « Enregistrer ».
 */
export default function NotificationPrefs({ initial }: { initial: NotificationPrefs }) {
  const [prefs, setPrefs] = useState(initial);
  const [, startTransition] = useTransition();

  function toggle(key: (typeof KEYS)[number]) {
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

  function changeDays(days: 1 | 3 | 7) {
    const before = prefs.rappel_jours;
    setPrefs((p) => ({ ...p, rappel_jours: days }));
    startTransition(async () => {
      try {
        await updateReminderDays(days);
      } catch {
        setPrefs((p) => ({ ...p, rappel_jours: before }));
      }
    });
  }

  return (
    <div>
      <ul className="divide-y divide-border-soft">
        {KEYS.map((key) => {
          const info = NOTIFICATION_LABELS[key];
          const checked = prefs[key];
          return (
            <li key={key} className="flex items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-foreground">{info.label}</p>
                <p className="text-sm text-muted">{info.hint}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={info.label}
                onClick={() => toggle(key)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-accent" : "bg-border"}`}
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

      {prefs.rappel_journee && (
        <label className="mt-1 flex flex-wrap items-center justify-between gap-3 border-t border-border-soft py-4 text-[15px] text-foreground">
          <span className="font-semibold">Moment du rappel</span>
          <select
            value={prefs.rappel_jours}
            onChange={(e) => changeDays(Number(e.target.value) as 1 | 3 | 7)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-[15px] text-foreground"
          >
            <option value={1}>1 jour avant</option>
            <option value={3}>3 jours avant</option>
            <option value={7}>7 jours avant</option>
          </select>
        </label>
      )}
    </div>
  );
}
