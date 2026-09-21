"use client";

import { usePathname } from "next/navigation";
import MinistryPicto from "@/components/MinistryPicto";
import { PROMOTION } from "@/lib/promotion";

/**
 * Pastille en haut à droite. Sur l'accueil, elle indique la promotion ; partout ailleurs,
 * le prénom de la personne avec le picto de son ministère.
 */
export default function HeaderBadge({
  firstName,
  ministrySlug,
  showPicto,
  avatarUrl,
}: {
  firstName: string;
  ministrySlug: string | null;
  showPicto: boolean;
  avatarUrl: string | null;
}) {
  const isHome = usePathname() === "/etudiant";

  if (isHome) {
    return (
      <span className="label inline-flex items-center whitespace-nowrap rounded-full border border-border px-3.5 py-[7px] text-[11px] tracking-[0.14em] text-foreground">
        Promotion {PROMOTION}
      </span>
    );
  }

  if (!firstName) return null;

  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border py-[5px] text-sm font-medium text-foreground ${
        showPicto || avatarUrl ? "pl-2 pr-3.5" : "px-3.5"
      }`}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- adresse temporaire signée, non optimisable
        <img src={avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
      ) : (
        showPicto && <MinistryPicto slug={ministrySlug} size={20} />
      )}
      {firstName}
    </span>
  );
}
