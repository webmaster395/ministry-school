"use client";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="rounded-2xl border border-[#c34a3d]/30 bg-background p-6" role="alert">
    <p className="text-xs font-semibold uppercase tracking-[.12em] text-[#9e3d32]">Chargement interrompu</p>
    <h1 className="mt-2 font-title text-2xl text-foreground">Les données de cette section n’ont pas pu être chargées.</h1>
    <p className="mt-2 text-sm text-muted">La navigation reste disponible. Vous pouvez relancer uniquement cette section.</p>
    <button type="button" onClick={reset} className="mt-5 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-on-accent">Réessayer</button>
  </section>;
}
