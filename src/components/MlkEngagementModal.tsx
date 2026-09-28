"use client";

import { useState } from "react";
import { X } from "lucide-react";
import MlkEngagementForm from "@/components/MlkEngagementForm";
import type { MlkEngagement } from "@/lib/mlk-engagement";

export default function MlkEngagementModal({
  initial,
}: {
  initial: MlkEngagement;
}) {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#27302f]/70 p-3 backdrop-blur-xs sm:p-5" role="dialog" aria-modal="true" aria-labelledby="engagement-title">
      <section className="relative max-h-[94vh] w-full max-w-[620px] overflow-y-auto rounded-[20px] border border-border bg-background p-5 shadow-[0_24px_64px_rgba(0,0,0,0.32)] sm:p-7">
        <button type="button" onClick={() => setOpen(false)} aria-label="Compléter plus tard" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-surface text-muted transition hover:text-foreground">
          <X size={18} />
        </button>
        <p className="label pr-12 text-[10px] tracking-[0.18em] text-muted">COMPLÈTE TON PROFIL · MOINS DE 30 SECONDES</p>
        <h2 id="engagement-title" className="font-title mt-2 pr-10 text-[26px] leading-tight text-foreground">Ton implication à MLK</h2>
        <p className="mt-2 max-w-[520px] text-sm leading-relaxed text-muted">
          Ces informations nous aident à mieux comprendre les étudiants de Ministry School. Tu pourras les modifier depuis ton profil.
        </p>
        <div className="mt-6">
          <MlkEngagementForm initial={initial} onSaved={() => setOpen(false)} />
        </div>
        <button type="button" onClick={() => setOpen(false)} className="mt-3 w-full py-2 text-center text-xs text-muted hover:text-foreground">
          Je compléterai plus tard
        </button>
      </section>
    </div>
  );
}
