"use client";

import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { createQuickCourse } from "@/app/gestion/admin/seances/actions";

type Choice = { id: string; name: string };

const field =
  "mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-foreground";

export default function QuickCourseForm({
  date,
  dateLabel,
  parking,
  trainers,
  ministries,
  services,
}: {
  date: string;
  dateLabel: string;
  parking: boolean;
  trainers: Choice[];
  ministries: Choice[];
  services: Choice[];
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
        className="m-auto w-[min(94vw,560px)] rounded-2xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/35"
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

        <form action={createQuickCourse} className="space-y-4 px-5 py-5 sm:px-6">
          <input type="hidden" name="session_date" value={date} />
          <input type="hidden" name="show_parking_notice" value={parking ? "1" : "0"} />

          <label className="block text-sm font-medium">
            Titre du cours
            <input name="title" required autoFocus placeholder="Ex. Vivre la libération dans mes finances" className={field} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">Début<input type="time" name="start_time" required className={field} /></label>
            <label className="block text-sm font-medium">Fin<input type="time" name="end_time" required className={field} /></label>
          </div>

          <label className="block text-sm font-medium">
            Catégorie
            <select name="track" value={category} onChange={(event) => setCategory(event.target.value)} className={field}>
              <option>Formation du cœur</option>
              <option>Formation du caractère</option>
              <option>Sensibilité ministérielle</option>
              <option>Mise en pratique</option>
              <option>Services &amp; Projets</option>
            </select>
          </label>

          {category === "Sensibilité ministérielle" && (
            <label className="block text-sm font-medium">
              Sensibilité
              <select name="ministry_id" required className={field}>
                <option value="">Choisir une sensibilité</option>
                {ministries.map((ministry) => <option key={ministry.id} value={ministry.id}>{ministry.name}</option>)}
              </select>
            </label>
          )}

          <label className="block text-sm font-medium">
            Formateur{category === "Services & Projets" ? " (facultatif)" : ""}
            <select name="trainer_id" required={category !== "Services & Projets"} className={field}>
              <option value="">{category === "Services & Projets" ? "Aucun formateur" : "Choisir un formateur"}</option>
              {trainers.map((trainer) => <option key={trainer.id} value={trainer.id}>{trainer.name}</option>)}
            </select>
          </label>

          {category === "Services & Projets" && (
            <label className="block text-sm font-medium">
              Service (facultatif)
              <select name="service_id" defaultValue="" className={field}>
                <option value="">Aucun service associé</option>
                {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
              </select>
            </label>
          )}

          <label className="block text-sm font-medium">
            Lieu et adresse
            <input name="location" required placeholder="Ex. MLK Studio · 2 rue Tirard, Créteil" className={field} />
          </label>

          <label className="block text-sm font-medium">
            Salle
            <input name="room" required placeholder="Saisir le nom de la salle" className={field} />
          </label>

          <p className="rounded-md bg-surface px-3.5 py-3 text-xs leading-relaxed text-muted">
            Après la création, vous accéderez à la fiche complète pour ajouter la présentation, les objectifs, la vidéo, les supports et les travaux avant/après.
          </p>

          <div className="flex items-center justify-end gap-3 border-t border-border-soft pt-4">
            <button type="button" onClick={() => dialogRef.current?.close()} className="px-3 py-2 text-sm text-muted hover:text-foreground">Annuler</button>
            <button type="submit" className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent">Créer et enrichir →</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
