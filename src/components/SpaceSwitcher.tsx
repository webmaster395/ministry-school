"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useSpace } from "@/components/SpaceProvider";

/**
 * Sélecteur de casquette, en haut à droite : la personne choisit l'espace à afficher
 * (administration, enseignant, pilotage…). Absent quand elle n'en a qu'un.
 */
export default function SpaceSwitcher() {
  const { spaces, current, select } = useSpace();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Comme dans la maquette : le sélecteur n'apparaît que dans un espace de gestion
  if (!current || spaces.length < 2) return null;

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Espace : ${current.label}. Changer d'espace`}
        className="inline-flex max-w-[210px] items-center sm:max-w-[220px] gap-2 rounded-full border border-foreground/30 py-[7px] pl-3.5 pr-3 text-sm font-medium text-foreground transition hover:border-foreground"
      >
        <span className="truncate">{current.label}</span>
        <ChevronDown size={16} strokeWidth={1.8} className={`shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Mes espaces"
          className="absolute left-0 top-full z-40 mt-2 w-[248px] max-w-[calc(100vw-32px)] sm:left-auto sm:right-0 overflow-hidden rounded-lg border border-border bg-background py-1 shadow-[0_12px_32px_rgba(0,0,0,0.14)]"
        >
          <li className="label px-4 pb-1 pt-2 text-[10px] tracking-[0.16em] text-muted" aria-hidden="true">
            Mes espaces
          </li>
          {spaces.map((space) => {
            const active = space.key === current.key;
            return (
              <li key={space.key} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (!active) select(space.key);
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[15px] transition hover:bg-foreground/[0.04] ${
                    active ? "font-medium text-foreground" : "text-[#4b524f]"
                  }`}
                >
                  {space.label}
                  {active && <Check size={16} strokeWidth={2} className="shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
