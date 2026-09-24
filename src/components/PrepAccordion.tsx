"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check, ChevronRight, Minus } from "lucide-react";

export type AccordionItem = { key: string; label: string; detail: string; done: boolean; required: boolean };

const ATTENTION = "bg-m-doctoral/[0.12] text-link";

/**
 * Liste de préparation dépliable sur place : chaque ligne s'ouvre pour modifier la partie
 * concernée sans quitter la page. Une adresse « #clé » (bouton « Continuer la préparation »)
 * ouvre directement la partie voulue.
 */
export default function PrepAccordion({ items, panels }: { items: AccordionItem[]; panels: Record<string, ReactNode> }) {
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const fromHash = () => {
      const key = window.location.hash.slice(1);
      if (!items.some((i) => i.key === key)) return;
      setOpen(key);
      document.getElementById(`prep-${key}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };
    const first = requestAnimationFrame(fromHash);
    window.addEventListener("hashchange", fromHash);
    return () => {
      cancelAnimationFrame(first);
      window.removeEventListener("hashchange", fromHash);
    };
  }, [items]);

  return (
    <ul className="divide-y divide-border-soft overflow-hidden rounded-lg border border-border bg-background">
      {items.map((it) => {
        const isOpen = open === it.key;
        return (
          <li key={it.key} id={`prep-${it.key}`}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : it.key)}
              className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-surface"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  it.done ? "bg-accent text-on-accent" : it.required ? ATTENTION : "bg-surface text-muted"
                }`}
              >
                {it.done ? (
                  <Check size={17} strokeWidth={2.2} />
                ) : it.required ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                ) : (
                  <Minus size={17} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold text-foreground">{it.label}</span>
                <span className="block truncate text-sm text-muted">{it.detail}</span>
              </span>
              <span
                className={`label shrink-0 rounded-full px-3 py-1 text-[10px] tracking-[0.1em] ${
                  it.done ? "bg-surface text-foreground" : it.required ? ATTENTION : "bg-surface text-muted"
                }`}
              >
                {it.done ? "Complété" : it.required ? "À compléter" : "Facultatif"}
              </span>
              <ChevronRight size={16} className={`shrink-0 text-muted transition ${isOpen ? "rotate-90" : ""}`} />
            </button>
            {isOpen && <div className="border-t border-border-soft bg-surface/50 px-5 py-5">{panels[it.key]}</div>}
          </li>
        );
      })}
    </ul>
  );
}
