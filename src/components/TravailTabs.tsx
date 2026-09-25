"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

type Tab = { key: string; label: string; count: number; href: string };

/** Onglets sur grand écran ; sur mobile, un menu déroulant pour choisir la période. */
export default function TravailTabs({ tabs, active }: { tabs: Tab[]; active: string }) {
  const router = useRouter();
  return (
    <>
      <div className="relative sm:hidden">
        <select
          aria-label="Période"
          value={active}
          onChange={(e) => router.push(tabs.find((t) => t.key === e.target.value)?.href ?? tabs[0].href)}
          className="w-full appearance-none rounded-full border border-border bg-background py-3 pl-4 pr-10 text-[15px] font-medium text-foreground"
        >
          {tabs.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label} ({t.count})
            </option>
          ))}
        </select>
        <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
      </div>

      <nav className="tabbar hidden gap-1 rounded-full border border-border bg-background p-1 sm:inline-flex">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
              active === t.key ? "bg-accent font-medium text-on-accent" : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
            <span
              className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] ${
                active === t.key ? "bg-white/20" : "bg-surface"
              }`}
            >
              {t.count}
            </span>
          </Link>
        ))}
      </nav>
    </>
  );
}
