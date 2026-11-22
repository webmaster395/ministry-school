"use client";

import { BookOpenText, CalendarDays } from "lucide-react";

export type PreparationMode = "program" | "synthesis";

export default function PreparationModeTabs({ mode, onChange }: { mode: PreparationMode; onChange: (mode: PreparationMode) => void }) {
  return <div className="mt-4 inline-grid grid-cols-2 rounded-xl border border-border bg-surface p-1" role="tablist" aria-label="Type de document">
    <button type="button" role="tab" aria-selected={mode === "program"} onClick={() => onChange("program")} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${mode === "program" ? "bg-background text-foreground shadow-sm" : "text-muted hover:text-foreground"}`}><CalendarDays size={16} /> Programme</button>
    <button type="button" role="tab" aria-selected={mode === "synthesis"} onClick={() => onChange("synthesis")} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${mode === "synthesis" ? "bg-background text-foreground shadow-sm" : "text-muted hover:text-foreground"}`}><BookOpenText size={16} /> Synthèse</button>
  </div>;
}
