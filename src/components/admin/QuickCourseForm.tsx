"use client";

import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { createQuickCourse } from "@/app/gestion/admin/seances/actions";
import AdminSelect from "@/components/admin/AdminSelect";

type Choice = { id: string; name: string };

const field =
  "mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-foreground";

export default function QuickCourseForm({
  date,
  dateLabel,
  parking,
  trainers,
  ministries,
}: {
  date: string;
  dateLabel: string;
  parking: boolean;
  trainers: Choice[];
  ministries: Choice[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [category, setCategory] = useState("Formation du cœur");

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-foreground transition hover:text-link"
      >
        <Plus size={17} /> Ajouter un cours
      </button>

      <dialog
        ref={dialogRef}
        className="m-0 h-dvh w-full max-w-none rounded-none border-0 bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/35 sm:m-auto sm:h-auto sm:max-h-[92dvh] sm:w-[min(94vw,560px)] sm:max-w-[560px] sm:rounded-2xl sm:border"
      >
        <div className="flex items-start justify-between border-b border-border-soft px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{dateLabel}</p>
            <h2 className="font-title mt-1 text-[24px]">Ajouter un cours</h2>
            <p className="mt-1 text-sm text-muted">Informations essentielles uniquement</p>
          </div>
          <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Fermer" className="rounded-full p-2 text-muted hover:bg-surface hover:text-foreground">
            <X size={19} />
          </button>
        </div>

        <form action={createQuickCourse} className="space-y-4 overflow-y-auto px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-h-[calc(92dvh-104px)] sm:px-6">
          <input type="hidden" name="session_date" value={date} />
          <input type="hidden" name="show_parking_notice" value={parking ? "1" : "0"} />

          <label className="block text-sm font-medium">
            Titre du cours
            <input name="title" required autoFocus placeholder="Ex. Vivre la libération dans mes finances" className={field} />
          </label>

          <div className="grid gap-3 min-[350px]:grid-cols-2">
            <label className="block text-sm font-medium">Début<input type="time" name="start_time" required className={field} /></label>
            <label className="block text-sm font-medium">Fin<input type="time" name="end_time" required className={field} /></label>
          </div>

          <label className="block text-sm font-medium">
            Catégorie
            <AdminSelect name="track" value={category} onValueChange={setCategory} className="mt-1.5" options={["Formation du cœur","Formation du caractère","Sensibilité ministérielle","Mise en pratique"].map((item) => ({ value:item,label:item }))} />
          </label>

          {category === "Sensibilité ministérielle" && (
            <label className="block text-sm font-medium">
              Sensibilité
              <AdminSelect name="ministry_id" placeholder="Choisir une sensibilité" className="mt-1.5" options={ministries.map((ministry) => ({ value:ministry.id,label:ministry.name }))} />
            </label>
          )}

          <label className="block text-sm font-medium">
            Intervenant
            <AdminSelect name="trainer_id" placeholder="Choisir un intervenant" className="mt-1.5" options={trainers.map((trainer) => ({ value:trainer.id,label:trainer.name }))} searchable />
          </label>

          <label className="block text-sm font-medium">
            Lieu et adresse
            <input name="location" required placeholder="Ex. MLK Studio · 2 rue Tirard, Créteil" className={field} />
          </label>

          <label className="block text-sm font-medium">
            Salle <span className="font-normal text-muted">(facultatif)</span>
            <input name="room" placeholder="Ex. Giroud" className={field} />
          </label>

          <p className="rounded-md bg-surface px-3.5 py-3 text-xs leading-relaxed text-muted">
            Après la création, vous accéderez à la fiche complète pour ajouter la présentation, les objectifs, la vidéo, les supports et les travaux avant/après.
          </p>

          <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-2 border-t border-border-soft bg-background px-4 pb-1 pt-4 sm:static sm:mx-0 sm:gap-3 sm:px-0">
            <button type="button" onClick={() => dialogRef.current?.close()} className="px-3 py-2 text-sm text-muted hover:text-foreground">Annuler</button>
            <button type="submit" className="min-h-11 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent sm:px-5">Créer et enrichir →</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
