"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSpace } from "@/components/SpaceProvider";
import { profileTabs } from "@/lib/nav";

/**
 * Les onglets de l'espace Profil (profil, messagerie et, pour un étudiant simple, une question).
 * Chaque onglet reste une page à part : seule la barre est commune.
 */
export default function ProfileTabs() {
  const pathname = usePathname();
  const { roles, unread } = useSpace();
  const tabs = profileTabs(roles);

  return (
    <nav
      aria-label="Profil"
      className={`grid gap-1 rounded-lg border border-border bg-background p-1 ${
        tabs.length === 3 ? "grid-cols-3" : "grid-cols-2"
      }`}
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={pathname === tab.href ? "page" : undefined}
          className={`rounded-md py-3 text-center text-[15px] transition ${
            pathname === tab.href ? "bg-accent font-medium text-on-accent" : "text-muted hover:text-foreground"
          }`}
        >
          {tab.label}
          {tab.href === "/etudiant/messages" && unread > 0 ? ` (${unread})` : ""}
        </Link>
      ))}
    </nav>
  );
}
