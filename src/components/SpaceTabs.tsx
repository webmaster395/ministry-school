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
      className="mb-5 grid gap-1 rounded-lg border border-border bg-background p-1"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => {
        const active = pathname === item.href.split("?")[0];
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md py-3 text-center text-[15px] transition ${
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
