"use client";

import Link from "next/link";
import { Wrench } from "lucide-react";

type Tab = { key: string; label: string; count?: number; href: string; distinct?: boolean };

/** Les statuts des devoirs restent groupés ; Mes outils est un espace distinct. */
export default function TravailTabs({ tabs, active }: { tabs: Tab[]; active: string }) {
  return (
    <nav aria-label="Travail et outils" className="flex max-w-full items-center gap-2 overflow-x-auto pb-1">
      <div className="tabbar inline-flex shrink-0 gap-1 rounded-full border border-border bg-background p-1">
        {tabs.filter((tab) => !tab.distinct).map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
              active === t.key ? "bg-accent font-medium text-on-accent" : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
            {typeof t.count === "number" && <span
              className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] ${
                active === t.key ? "bg-white/20" : "bg-surface"
              }`}
            >
              {t.count}
            </span>}
          </Link>
        ))}
      </div>
      <span aria-hidden="true" className="mx-1 h-7 w-px shrink-0 bg-border" />
      {tabs.filter((tab) => tab.distinct).map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm transition ${
            active === t.key
              ? "border-foreground bg-accent font-medium text-on-accent"
              : "border-border bg-background text-foreground hover:border-foreground"
          }`}
        >
          <Wrench size={15} aria-hidden="true" />
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
