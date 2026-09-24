"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertCircle, Ban, Trash2, X } from "lucide-react";
import { rejectOpportunity, type RejectState } from "@/app/etudiant/services/actions";

export default function RejectOpportunityDialog({
  id,
  title,
  kind,
  triggerClassName,
  triggerLabel = "Refuser",
  variant = "outline",
}: {
  id: string;
  title: string;
  kind?: string;
  triggerClassName?: string;
  triggerLabel?: string;
  variant?: "outline" | "danger" | "compact";
}) {
  const [open, setOpen] = useState(false);
  const [deletePermanently, setDeletePermanently] = useState(false);
  const [state, action, pending] = useActionState<RejectState, FormData>(rejectOpportunity, {});

  useEffect(() => {
    if (state.success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- ferme la fenêtre après un refus enregistré
      setOpen(false);
    }
  }, [state.success]);

  const defaultTriggerClass =
    variant === "compact"
      ? "inline-flex items-center gap-1 text-xs text-muted hover:text-foreground underline"
      : variant === "danger"
      ? "inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface hover:border-foreground/30"
      : "inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-muted transition hover:border-foreground/40 hover:text-foreground";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName ?? defaultTriggerClass}
      >
        <Ban size={14} /> {triggerLabel}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-foreground">
                <AlertCircle size={20} className="text-muted" />
                <h3 className="font-title text-[20px] font-bold text-foreground">
                  Refuser la proposition
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="rounded-full p-1 text-muted hover:bg-surface hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mt-2 text-sm text-muted">
              Vous examinez la proposition <strong className="text-foreground">« {title} »</strong>.
            </p>

            <form action={action} className="mt-4 space-y-4">
              <input type="hidden" name="opportunity_id" value={id} />

              <div>
                <label className="mb-1 block text-xs font-medium text-foreground">
                  Motif du refus ou remarques pour l&apos;auteur
                </label>
                <textarea
                  name="reason"
                  rows={3}
                  placeholder="Ex : Il manque le lieu précis, ou le calendrier n'est pas conforme aux créneaux..."
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:border-foreground focus:outline-none"
                />
              </div>

              <div className="rounded-lg border border-border bg-surface p-3 text-xs text-muted">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="delete_permanently"
                    value="1"
                    checked={deletePermanently}
                    onChange={(e) => setDeletePermanently(e.target.checked)}
                    className="mt-0.5 rounded border-border"
                  />
                  <span>
                    <strong className="text-foreground">Supprimer définitivement</strong> la proposition au lieu de simplement la refuser.
                  </span>
                </label>
              </div>

              {state.error && (
                <p className="rounded-lg bg-red-50 p-2 text-xs font-medium text-red-600 dark:bg-red-950/50 dark:text-red-300">
                  {state.error}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted hover:text-foreground"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-xs font-semibold text-background transition hover:opacity-90"
                >
                  {pending ? (
                    "Traitement..."
                  ) : deletePermanently ? (
                    <>
                      <Trash2 size={14} /> Supprimer définitivement
                    </>
                  ) : (
                    <>
                      <Ban size={14} /> Confirmer le refus
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
