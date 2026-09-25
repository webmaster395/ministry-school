"use client";

import { useEffect, useState } from "react";
import { LogoCompact } from "@/components/Logo";
import MinistryPicto from "@/components/MinistryPicto";
import { getMinistry } from "@/lib/ministry";
import { NavSections, ProfileLink } from "@/components/NavBlocks";

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {direction === "left" ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
    </svg>
  );
}

export default function Sidebar({
  fullName,
  avatarUrl,
  ministrySlug,
}: {
  fullName: string;
  avatarUrl: string | null;
  ministrySlug?: string | null;
}) {
  const [collapsed, setCollapsed] = useState(false);
  // Sur téléphone, le même menu est servi par MobileNav.
  const ministry = getMinistry(ministrySlug);

  // Restaure le choix de l'utilisateur d'une visite à l'autre
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lu après le montage pour éviter un écart serveur/navigateur
    setCollapsed(localStorage.getItem("sidebar-collapsed") === "1");
  }, []);

  function toggle() {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem("sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }

  return (
    <aside
      className={`app-sidebar sticky top-0 hidden shrink-0 flex-col self-start border-r border-border bg-background transition-[width] duration-200 md:flex ${
        collapsed ? "w-[58px]" : "w-[220px]"
      }`}
    >
      {/* En-tête : l'ovale de la charte sur fond encre */}
      <div className="relative flex h-[64px] items-center justify-center bg-foreground">
        {collapsed ? (
          <div className="flex items-center justify-center">
            {ministry ? (
              <MinistryPicto slug={ministry.slug} size={24} />
            ) : (
              <span className="label text-[13px] text-on-accent">MS</span>
            )}
          </div>
        ) : (
          <LogoCompact priority />
        )}
      </div>

      <div className={`flex ${collapsed ? "justify-center" : "justify-end"} px-3 pt-2`}>
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Déployer le menu" : "Réduire le menu"}
          title={collapsed ? "Déployer le menu" : "Réduire le menu"}
          className="rounded-md p-1 text-muted transition hover:bg-foreground/[0.04] hover:text-foreground"
        >
          <ChevronIcon direction={collapsed ? "right" : "left"} />
        </button>
      </div>

      <nav className={`min-h-0 flex-1 space-y-6 overflow-y-auto pb-6 pt-2 ${collapsed ? "px-2" : "px-4"}`}>
        <NavSections collapsed={collapsed} />
      </nav>

      {/* Bas du menu : le profil, avec la photo et le prénom */}
      <div className={`border-t border-border-soft py-2 ${collapsed ? "px-2" : "px-3"}`}>
        <ProfileLink fullName={fullName} avatarUrl={avatarUrl} ministrySlug={ministrySlug} collapsed={collapsed} />
      </div>
    </aside>
  );
}
