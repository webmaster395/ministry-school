"use client";

import Link from "next/link";
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

  return (
    <nav
      aria-label={current.label}
      className="tabbar mb-6 flex items-center gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0"
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
  );
}
