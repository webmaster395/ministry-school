import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatSessionDate, formatTimeRange } from "@/lib/format";
import type { ProgramEntry } from "@/lib/data/admin-hub";

const ATTENTION = "bg-m-doctoral/[0.12] text-link";

export function DayList({ entries }: { entries: ProgramEntry[] }) {
  return (
    <ul className="divide-y divide-border-soft overflow-hidden rounded-lg border border-border bg-background">
      {entries.map((e) => (
        <li key={e.key}>
          <Link href={e.href} className="flex items-center gap-4 px-5 py-4 transition hover:bg-surface">
            <span className="w-[110px] shrink-0 text-[15px] text-foreground">{formatTimeRange(e.start, e.end)}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-semibold text-foreground">{e.title}</span>
              <span className="block truncate text-sm text-muted">{e.sub}</span>
            </span>
            <span
              className={`label shrink-0 rounded-full px-3 py-1 text-[10px] tracking-[0.1em] ${
                e.attention ? ATTENTION : "bg-surface text-foreground"
              }`}
            >
              {e.badge}
            </span>
            <ChevronRight size={16} className="shrink-0 text-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function ProgramTab({ entries, view, today }: { entries: ProgramEntry[]; view: string; today: string }) {
  const upcoming = entries.filter((e) => e.date >= today);
  const past = entries.filter((e) => e.date < today);
  const nextDate = upcoming[0]?.date;

  const groups = (list: ProgramEntry[]) => {
    const map = new Map<string, ProgramEntry[]>();
    for (const e of list) map.set(e.date, [...(map.get(e.date) ?? []), e]);
    return [...map.entries()];
  };

  const shown =
    view === "avenir"
      ? groups(upcoming.filter((e) => e.date !== nextDate))
      : view === "passees"
        ? groups(past).reverse()
        : groups(upcoming.filter((e) => e.date === nextDate));

  const tabs = [
    { key: "journee", label: "Prochaine journée", href: "/admin?onglet=programme" },
    { key: "avenir", label: "Journées à venir", href: "/admin?onglet=programme&vue=avenir" },
    { key: "passees", label: "Journées passées", href: "/admin?onglet=programme&vue=passees" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="inline-flex gap-1 rounded-lg border border-border bg-background p-1">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={t.href}
              className={`rounded-md px-4 py-2 text-sm transition ${
                (view || "journee") === t.key ? "bg-accent font-medium text-on-accent" : "text-muted hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <Link href="/admin/seances" className="text-sm font-medium text-foreground underline underline-offset-2">
          Gérer les séances
        </Link>
      </div>

      {shown.length ? (
        shown.map(([date, list]) => (
          <section key={date} className="space-y-3">
            <h3 className="font-title text-[22px] text-foreground">{formatSessionDate(date)}</h3>
            <DayList entries={list} />
          </section>
        ))
      ) : (
        <section className="rounded-lg border border-border bg-background p-6">
          <p className="text-[15px] text-muted">Aucune journée à afficher.</p>
        </section>
      )}
    </div>
  );
}
