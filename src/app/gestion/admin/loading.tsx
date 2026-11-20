export default function AdminLoading() {
  return <div className="space-y-5" role="status" aria-live="polite">
    <div className="h-5 w-32 animate-pulse rounded bg-border-soft" />
    <div className="h-12 w-72 max-w-full animate-pulse rounded-lg bg-border-soft" />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-32 animate-pulse rounded-xl border border-border bg-background" />)}
    </div>
    <p className="text-sm text-muted">Chargement des données administratives…</p>
  </div>;
}
