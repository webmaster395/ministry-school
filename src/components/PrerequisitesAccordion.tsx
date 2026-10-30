"use client";

import { useId, useState } from "react";
import { ChevronRight } from "lucide-react";

export default function PrerequisitesAccordion({ items }: { items: string[] }) {
  const [open, setOpen] = useState(false);
  const contentId = useId();

  return (
    <div className="mt-2 font-normal">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-10 w-full items-center gap-1.5 rounded-lg py-1 text-left font-semibold text-foreground outline-none transition hover:text-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        <ChevronRight
          size={16}
          aria-hidden="true"
          className={`shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
        <span>Prérequis nécessaires</span>
      </button>
      <div
        id={contentId}
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <ul className="space-y-1.5 pb-1 pl-6 pt-1 text-sm leading-6 text-muted">
            {items.map((item, index) => <li key={`${item}-${index}`} className="list-disc">{item}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
