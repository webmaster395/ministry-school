"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { createCourse, type CourseFormState } from "@/app/gestion/pilotage/actions";

const field = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-[15px] text-foreground";
const label = "mb-1.5 block text-[14px] text-muted";

/** « Ajouter un cours » : les informations indispensables ; le contenu pédagogique se complète ensuite sur la fiche du cours. */
export default function AddCourseDialog({ ministryId, drafts = false }: { ministryId: string; drafts?: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CourseFormState, FormData>(createCourse, {});

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-[15px] font-medium text-on-accent transition hover:bg-[#1b2221]"
      >
        <Plus size={16} strokeWidth={2} /> Ajouter un cours
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <form
            action={action}
            role="dialog"
            aria-modal="true"
            aria-label="Ajouter un cours"
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[94vh] w-full max-w-[640px] space-y-4 overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)] sm:rounded-2xl sm:p-7"
          >
            <input type="hidden" name="ministry_id" value={ministryId} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="absolute right-4 top-4 rounded-md p-1 text-muted transition hover:bg-foreground/[0.06] hover:text-foreground"
            >
              <X size={18} />
            </button>

            <header className="pr-6">
              <h2 className="font-title text-[22px] leading-tight text-foreground">Ajouter un cours</h2>
              <p className="mt-1.5 text-[14px] text-muted">
                Commencez par les informations indispensables. Les contenus pédagogiques pourront être complétés ensuite
                dans la fiche partagée.
              </p>
            </header>

            <div>
              <label className={label} htmlFor="course-title">Titre *</label>
              <input id="course-title" name="title" required className={field} />
            </div>

            <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr_1fr]">
              <div>
                <label className={label} htmlFor="course-date">Date *</label>
                <input id="course-date" name="session_date" type="date" required className={field} />
              </div>
              <div>
                <label className={label} htmlFor="course-start">Heure de début *</label>
                <input id="course-start" name="start_time" type="time" required defaultValue="11:30" className={field} />
              </div>
              <div>
                <label className={label} htmlFor="course-end">Heure de fin *</label>
                <input id="course-end" name="end_time" type="time" required defaultValue="13:00" className={field} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
              <div>
                <label className={label} htmlFor="course-location">Lieu *</label>
                <input id="course-location" name="location" required defaultValue="MLK Studio" className={field} />
              </div>
              <div>
                <label className={label} htmlFor="course-room">Salle</label>
                <input id="course-room" name="room" className={field} />
              </div>
            </div>

            <div>
              <label className={label} htmlFor="course-speaker">Formateur ou intervenants</label>
              <input
                id="course-speaker"
                name="speaker_name"
                placeholder="Séparez plusieurs noms par une virgule"
                className={field}
              />
            </div>

            <div>
              <label className={label} htmlFor="course-summary">Présentation</label>
              <textarea id="course-summary" name="summary" rows={3} className={field} />
            </div>

            <div>
              <label className={label} htmlFor="course-objectives">Objectifs</label>
              <p className="-mt-1 mb-1.5 text-[12px] text-muted">Un objectif par ligne</p>
              <textarea id="course-objectives" name="objectives" rows={3} className={field} />
            </div>

            {state.error && (
              <p role="alert" className="rounded-lg border border-m-doctoral/30 bg-m-doctoral/10 px-3 py-2 text-[14px] text-link">
                {state.error}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-border bg-background px-5 py-2.5 text-[15px] text-foreground transition hover:border-foreground"
              >
                Annuler
              </button>
              {drafts && (
                <button
                  type="submit"
                  name="intent"
                  value="draft"
                  disabled={pending}
                  className="rounded-full border border-border bg-background px-5 py-2.5 text-[15px] text-foreground transition hover:border-foreground disabled:opacity-60"
                >
                  Enregistrer comme brouillon
                </button>
              )}
              <button
                type="submit"
                name="intent"
                value="publish"
                disabled={pending}
                className="rounded-full bg-accent px-5 py-2.5 text-[15px] font-medium text-on-accent transition hover:bg-[#1b2221] disabled:opacity-60"
              >
                {pending ? "Création…" : "Créer le cours"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
