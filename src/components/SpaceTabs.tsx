"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSpace } from "@/components/SpaceProvider";

/**
 * Navigation interne d'un espace de gestion : ses pages sont sur une barre en haut de la page,
 * pas dans le menu de gauche, qui reste celui de l'étudiant. Absente s'il n'y a qu'une page.
 */
export default function SpaceTabs() {
  const pathname = usePathname();
  const { current } = useSpace();
  const items = current?.sections.flatMap((section) => section.items) ?? [];
  if (!current || items.length < 2) return null;

  return (
    <nav
      aria-label={current.label}
      className="tabbar mb-5 flex items-stretch gap-1 overflow-x-auto rounded-lg border border-border bg-background p-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] sm:grid"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => {
        const active = pathname === item.href.split("?")[0];
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex-1 shrink-0 whitespace-nowrap rounded-md px-3 py-2 text-center text-xs font-medium transition sm:whitespace-normal sm:py-3 sm:text-[15px] ${
              active ? "bg-accent font-medium text-on-accent" : "text-muted hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
