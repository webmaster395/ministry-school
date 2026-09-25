"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import Portal from "@/components/Portal";
import { deleteOpportunity } from "@/app/gestion/actions";

/**
 * « Supprimer » une fiche, avec une confirmation avant de supprimer : la suppression retire aussi
 * les dates, les inscriptions et les comptes rendus, et elle est définitive.
 */
export default function DeleteOpportunityButton({ id, title, kind }: { id: string; title: string; kind: "formation" | "projet" }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const noun = kind === "projet" ? "ce projet" : "cette formation";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function confirm(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      await deleteOpportunity(formData);
    } catch (e) {
      // La redirection de l'action n'est pas une erreur : seule une vraie erreur s'affiche
      const message = e instanceof Error ? e.message : "";
      if (message.includes("NEXT_REDIRECT")) return;
      setError(message || "La suppression a échoué.");
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-[14px] font-medium text-link transition hover:border-link"
      >
        <Trash2 size={15} /> Supprimer
      </button>

      {open && (
        <Portal>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <form
              action={confirm}
              role="alertdialog"
              aria-modal="true"
              aria-label="Confirmer la suppression"
              className="relative max-h-[94dvh] w-full max-w-[460px] space-y-4 overflow-y-auto rounded-2xl bg-background p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
            >
              <input type="hidden" name="id" value={id} />
              <h2 className="font-title text-[22px] leading-tight text-foreground">Supprimer {noun} ?</h2>
              <p className="text-[15px] leading-relaxed text-muted">
                « {title} » sera supprimé{kind === "formation" ? "e" : ""} avec ses dates, ses inscriptions et ses comptes
                rendus. Cette action est définitive.
              </p>
              {error && (
                <p role="alert" className="rounded-lg border border-m-doctoral/30 bg-m-doctoral/10 px-3 py-2 text-[14px] text-link">
                  {error}
                </p>
              )}
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="rounded-full border border-border bg-background px-5 py-2.5 text-[15px] text-foreground transition hover:border-foreground disabled:opacity-60"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-full bg-accent px-5 py-2.5 text-[15px] font-medium text-on-accent transition hover:bg-[#1b2221] disabled:opacity-60"
                >
                  {pending ? "Suppression…" : "Supprimer définitivement"}
                </button>
              </div>
            </form>
          </div>
        </Portal>
      )}
    </>
  );
}
