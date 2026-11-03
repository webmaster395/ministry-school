"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { LogoCompact } from "@/components/Logo";
import { NavSections, ProfileLink } from "@/components/NavBlocks";
import { useSpace } from "@/components/SpaceProvider";

/**
 * Menu du téléphone : un bouton dans l'en-tête ouvre un panneau latéral
 * reprenant les mêmes sections que le menu de bureau, masqué à partir de `md`.
 */
export default function MobileNav({
  fullName,
  avatarUrl,
  ministrySlug,
}: {
  fullName: string;
  avatarUrl: string | null;
  ministrySlug?: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const { unread } = useSpace();

  // Refermer dès que la page change, y compris avec le bouton « retour » du téléphone.
  // L'ajustement se fait pendant le rendu plutôt que dans un effet, pour éviter
  // d'afficher le panneau un instant par-dessus la nouvelle page.
  const [shownFor, setShownFor] = useState(pathname);
  if (shownFor !== pathname) {
    setShownFor(pathname);
    if (open) setOpen(false);
  }

  // Pendant l'ouverture, seul le panneau peut recevoir un geste de
  // défilement. On ne met pas le `body` en position fixe : dans l'application
  // ce déplacement de repère faisait sauter le tiroir sur certains iPhone.
  useEffect(() => {
    if (!open) return;

    const opener = trigger.current;
    const body = document.body;
    const root = document.documentElement;
    const scrollY = window.scrollY;
    const bodyStyle = {
      overflow: body.style.overflow,
      height: body.style.height,
      overscrollBehavior: body.style.overscrollBehavior,
    };
    const rootStyle = {
      overflow: root.style.overflow,
      height: root.style.height,
      overscrollBehavior: root.style.overscrollBehavior,
    };

    root.style.overflow = "hidden";
    root.style.height = "100%";
    root.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.height = "100%";
    body.style.overscrollBehavior = "none";
    panel.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function preventBackgroundTouch(event: TouchEvent) {
      if (!panel.current?.contains(event.target as Node)) event.preventDefault();
    }
    function preventBackgroundWheel(event: WheelEvent) {
      if (!panel.current?.contains(event.target as Node)) event.preventDefault();
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("touchmove", preventBackgroundTouch, { passive: false });
    document.addEventListener("wheel", preventBackgroundWheel, { passive: false });

    return () => {
      body.style.overflow = bodyStyle.overflow;
      body.style.height = bodyStyle.height;
      body.style.overscrollBehavior = bodyStyle.overscrollBehavior;
      root.style.overflow = rootStyle.overflow;
      root.style.height = rootStyle.height;
      root.style.overscrollBehavior = rootStyle.overscrollBehavior;
      window.scrollTo(0, scrollY);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("touchmove", preventBackgroundTouch);
      document.removeEventListener("wheel", preventBackgroundWheel);
      opener?.focus();
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={unread > 0 ? `Ouvrir le menu, ${unread} message${unread > 1 ? "s" : ""} non lu${unread > 1 ? "s" : ""}` : "Ouvrir le menu"}
        aria-expanded={open}
        className="-ml-1 flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-md text-foreground transition hover:bg-foreground/[0.06]"
      >
        <span className="relative">
          <Menu size={24} strokeWidth={1.7} />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-m-doctoral" aria-hidden="true" />
          )}
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex h-[100dvh] overscroll-none">
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-foreground/40"
          />

          <div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            tabIndex={-1}
            className="mobile-nav-panel relative flex h-full w-[286px] max-w-[85vw] flex-col overflow-hidden bg-background shadow-[0_0_40px_rgba(0,0,0,0.25)] outline-none"
          >
            <div className="mobile-nav-panel__head relative flex min-h-[88px] shrink-0 items-center justify-center bg-foreground">
              <LogoCompact />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
                className="mobile-nav-panel__close absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-md text-on-accent transition hover:bg-white/10"
              >
                <X size={22} strokeWidth={1.8} />
              </button>
            </div>

            <nav className="mobile-nav-panel__nav min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 pb-6 pt-5">
              <NavSections onNavigate={() => setOpen(false)} />
            </nav>

            <div className="mobile-nav-panel__profile shrink-0 border-t border-border-soft px-3 py-3">
              <ProfileLink fullName={fullName} avatarUrl={avatarUrl} ministrySlug={ministrySlug} onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
