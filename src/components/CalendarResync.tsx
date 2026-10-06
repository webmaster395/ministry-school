"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import CalendarSyncDialog from "@/components/CalendarSyncDialog";

/** Pour une personne déjà synchronisée : recommencer (nouveau téléphone, agenda effacé…). */
export default function CalendarResync({ subscribeUrl }: { subscribeUrl: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-4">
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-foreground">Calendrier</p>
        <p className="text-sm text-muted">Nouveau téléphone ou agenda effacé ? Reprenez la synchronisation de vos formations.</p>
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-foreground bg-background px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-foreground/[0.04]"
      >
        <RefreshCw size={16} strokeWidth={1.8} /> Synchroniser à nouveau
      </button>
      <CalendarSyncDialog open={open} onClose={() => setOpen(false)} subscribeUrl={subscribeUrl} />
    </div>
  );
}
