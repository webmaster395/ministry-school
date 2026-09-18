/**
 * Squelettes affichés pendant que les données arrivent du serveur.
 * Ils reprennent la forme du contenu réel pour éviter que la page
 * ne « saute » au moment du remplacement.
 */

function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-[#efe9dd] ${className}`} />;
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <section className="rounded-lg border border-border bg-background p-6">
      <Bar className="h-3 w-40" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: lines }, (_, i) => (
          <Bar key={i} className={`h-4 ${i === 0 ? "w-3/5" : i % 2 ? "w-full" : "w-4/5"}`} />
        ))}
      </div>
    </section>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <section className="rounded-lg border border-border bg-background p-6">
      <Bar className="h-3 w-40" />
      <ul className="mt-5 divide-y divide-border">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="flex items-center justify-between gap-4 py-3">
            <Bar className="h-4 w-2/5" />
            <Bar className="h-4 w-1/4" />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Bar className="h-4 w-52" />
        <CardSkeleton lines={3} />
        <CardSkeleton lines={2} />
      </div>
      <section className="rounded-lg border border-border bg-background p-5">
        <Bar className="h-4 w-32" />
        <div className="mt-4 grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, i) => (
            <Bar key={i} className="h-14" />
          ))}
        </div>
        <Bar className="mt-5 h-28 w-full" />
      </section>
    </div>
  );
}
