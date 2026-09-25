"use client";

import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";

type State = "unknown" | "unsupported" | "default" | "granted" | "denied";

/**
 * « Activer les notifications » : demande l'autorisation du navigateur sur cet appareil.
 * L'état est lu après le montage (le navigateur seul le connaît).
 */
export default function EnableNotifications() {
  const [state, setState] = useState<State>("unknown");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- l'autorisation n'est lisible qu'après le montage
    setState(typeof Notification === "undefined" ? "unsupported" : (Notification.permission as State));
  }, []);

  async function enable() {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setState(result as State);
  }

  if (state === "unknown") return null;

  if (state === "granted") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-[15px] text-foreground">
        <Check size={18} strokeWidth={2} aria-hidden="true" /> Notifications actives sur cet appareil
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <Bell size={20} strokeWidth={1.7} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
        <div>
          <p className="text-[15px] font-semibold text-foreground">
            {state === "denied" ? "Notifications désactivées" : "Notifications non activées"}
          </p>
          <p className="text-sm text-muted">
            {state === "denied"
              ? "Autorisez les notifications dans les réglages de votre navigateur ou de votre appareil."
              : state === "unsupported"
                ? "Ce navigateur ne permet pas les notifications. Essayez depuis l'application installée."
                : "Activez-les pour recevoir les messages et les rappels sur cet appareil."}
          </p>
        </div>
      </div>
      {state === "default" && (
        <button
          type="button"
          onClick={enable}
          className="rounded-full bg-accent px-5 py-2.5 text-[14px] font-medium text-on-accent transition hover:bg-[#1b2221]"
        >
          Activer les notifications
        </button>
      )}
    </div>
  );
}
