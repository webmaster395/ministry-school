"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSpace } from "@/components/SpaceProvider";

/**
 * Navigation interne d'un espace de gestion : ses pages sont sur une barre en haut de la page,
 * pas dans le menu de gauche, qui reste celui de l'étudiant. Absente s'il n'y a qu'une page.
 */
export default function SpaceTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { current } = useSpace();
  const items = current?.sections.flatMap((section) => section.items) ?? [];
  if (!current || items.length < 2) return null;

  const activeItem = items.find((item) => {
    const [itemPath, query] = item.href.split("?");
    const expectedTab = query ? new URLSearchParams(query).get("onglet") : null;
    return pathname === itemPath && (expectedTab ? searchParams.get("onglet") === expectedTab : !searchParams.get("onglet"));
  });

  return (
    <>
      <details className="group relative z-30 mb-5 sm:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm [&::-webkit-details-marker]:hidden">
          <span><span className="mr-2 text-xs font-medium uppercase tracking-[0.12em] text-muted">Admin</span>{activeItem?.label ?? current.label}</span>
          <ChevronDown size={18} className="text-muted transition group-open:rotate-180" />
        </summary>
        <nav aria-label={current.label} className="absolute inset-x-0 top-[calc(100%+6px)] overflow-hidden rounded-xl border border-border bg-background p-1.5 shadow-xl">
          {items.map((item) => {
            const [itemPath, query] = item.href.split("?");
            const expectedTab = query ? new URLSearchParams(query).get("onglet") : null;
            const currentTab = searchParams.get("onglet");
            const active = pathname === itemPath && (expectedTab ? currentTab === expectedTab : !currentTab);
            return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`block min-h-11 rounded-lg px-3.5 py-3 text-sm font-medium ${active ? "bg-accent text-on-accent" : "text-foreground hover:bg-surface"}`}>{item.label}</Link>;
          })}
        </nav>
      </details>
      <nav
      aria-label={current.label}
      className="tabbar mb-6 hidden flex-wrap items-center gap-2 sm:flex"
    >
      {items.map((item) => {
        const [itemPath, query] = item.href.split("?");
        const expectedTab = query ? new URLSearchParams(query).get("onglet") : null;
        const currentTab = searchParams.get("onglet");
        const active = pathname === itemPath && (expectedTab ? currentTab === expectedTab : !currentTab);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2.5 text-center text-sm font-medium transition sm:px-5 ${
              active ? "bg-accent text-on-accent" : "bg-surface text-muted hover:bg-foreground/[0.08] hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
      </nav>
    </>
  );
}
