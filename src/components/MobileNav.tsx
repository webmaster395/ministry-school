"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { LogoCompact } from "@/components/Logo";
import MinistryPicto from "@/components/MinistryPicto";
import { getMinistry } from "@/lib/ministry";
import { useSpace } from "@/components/SpaceProvider";
import type { ViewerRoles } from "@/lib/roles";

/**
 * Menu du téléphone : un bouton dans l'en-tête ouvre un panneau latéral
 * reprenant les mêmes sections que le menu de bureau, masqué à partir de `md`.
 */
export default function MobileNav({
  roles,
  ministrySlug,
}: {
  roles: ViewerRoles;
  ministrySlug?: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  const { spaces, current, select } = useSpace();
  const sections = current.sections;
  const ministry = getMinistry(ministrySlug);

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

            {spaces.length > 1 && (
              <div className="border-b border-border-soft px-4 pb-4 pt-4">
                <p className="label mb-2 px-3 text-[11px] !font-medium tracking-[0.16em] text-muted">
                  Mes espaces
                </p>
                <ul className="space-y-0.5">
                  {spaces.map((space) => {
                    const active = space.key === current.key;
                    return (
                      <li key={space.key}>
                        <button
                          type="button"
                          onClick={() => {
                            if (active) return;
                            setOpen(false);
                            select(space.key);
                          }}
                          aria-pressed={active}
                          className={`flex w-full items-center justify-between rounded-[7px] px-3 py-2.5 text-left text-[15px] transition ${
                            active
                              ? "bg-accent font-medium text-on-accent"
                              : "text-[#4b524f] hover:bg-foreground/[0.04]"
                          }`}
                        >
                          {space.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <nav className="flex-1 space-y-6 px-4 pb-6 pt-5">
              {sections.map((section) => (
                  <div key={section.title}>
                    <p className="label mb-2 px-3 text-[11px] !font-medium tracking-[0.16em] text-muted">
                      {section.title}
                    </p>
                    <ul className="space-y-0.5">
                      {section.items.map((item) => {
                        const active = pathname === item.href.split("?")[0];
                        return (
                          <li key={item.label}>
                            <Link
                              href={item.href}
                              className={`flex items-center gap-[11px] rounded-[7px] px-3 py-3 text-[15px] transition ${
                                active
                                  ? "bg-foreground/[0.08] font-medium text-foreground"
                                  : "text-[#4b524f] hover:bg-foreground/[0.04]"
                              }`}
                            >
                              <span className={active ? "text-foreground" : "text-[#8b918e]"}>
                                {item.icon}
                              </span>
                              {item.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
              ))}
            </nav>

            {(roles.admin || ministry) && (
              <div className="flex shrink-0 items-center gap-2.5 border-t border-border-soft px-5 py-4">
                {!roles.admin && ministry && <MinistryPicto slug={ministry.slug} size={20} />}
                <span className="label text-[10px] tracking-[0.18em] text-muted">
                  {roles.admin ? "Administration" : `Sensibilité ${ministry!.adjective}`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
