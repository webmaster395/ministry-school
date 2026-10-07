"use client";

import { useEffect } from "react";

export default function StudentError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches;
    void fetch("/api/diagnostics/course-render", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        digest: error.digest ?? "missing",
        route: window.location.pathname,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        displayMode: standalone ? "standalone" : "browser",
        online: navigator.onLine,
        serviceWorkerControlled: !!navigator.serviceWorker?.controller,
      }),
      keepalive: true,
    }).catch(() => undefined);
  }, [error]);

  return (
    <section className="mx-auto max-w-lg rounded-xl border border-border bg-background p-6 text-center">
      <h1 className="font-title text-2xl text-foreground">Cette page n’a pas pu se charger</h1>
      <p className="mt-2 text-sm text-muted">L’erreur a été enregistrée pour diagnostic. Vous pouvez réessayer.</p>
      <button type="button" onClick={reset} className="mt-5 min-h-11 rounded-full bg-accent px-5 text-sm font-semibold text-on-accent">Réessayer</button>
      {error.digest && <p className="mt-4 text-[11px] text-muted">Référence : {error.digest}</p>}
    </section>
  );
}
