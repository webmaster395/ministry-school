"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { LogoCompact } from "@/components/Logo";
import { NavSections, ProfileLink } from "@/components/NavBlocks";

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

  // Refermer dès que la page change, y compris avec le bouton « retour » du téléphone.
  // L'ajustement se fait pendant le rendu plutôt que dans un effet, pour éviter
  // d'afficher le panneau un instant par-dessus la nouvelle page.
  const [shownFor, setShownFor] = useState(pathname);
  if (shownFor !== pathname) {
    setShownFor(pathname);
    if (open) setOpen(false);
  }

  // Pendant l'ouverture : la page ne défile plus derrière, Échap referme,
  // et le focus part dans le panneau puis revient sur le bouton.
  useEffect(() => {
    if (!open) return;

    const opener = trigger.current;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    panel.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus();
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        aria-expanded={open}
        className="-ml-2 flex h-11 w-11 items-center justify-center rounded-md text-foreground transition hover:bg-foreground/[0.06]"
      >
        <Menu size={24} strokeWidth={1.7} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
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
            className="relative flex h-full w-[286px] max-w-[85vw] flex-col overflow-y-auto bg-background shadow-[0_0_40px_rgba(0,0,0,0.25)] outline-none"
          >
            <div className="relative flex h-[88px] shrink-0 items-center justify-center bg-foreground">
              <LogoCompact />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
                className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-md text-on-accent transition hover:bg-white/10"
              >
                <X size={22} strokeWidth={1.8} />
              </button>
            </div>

            <nav className="flex-1 space-y-6 px-4 pb-6 pt-5">
              <NavSections />
            </nav>

            <div className="shrink-0 border-t border-border-soft px-3 py-3">
              <ProfileLink fullName={fullName} avatarUrl={avatarUrl} ministrySlug={ministrySlug} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
