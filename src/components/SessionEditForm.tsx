"use client";

import { useActionState, useState } from "react";
import { deleteSessionFromCard, updateSessionWithFeedback } from "@/lib/actions/sessions";

export type EditableSession = {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  location: string;
  room: string | null;
  description: string | null;
  track?: string | null;
  speaker_name?: string | null;
  summary?: string | null;
  objectives?: string | null;
  bible_refs?: string | null;
  teacherName?: string | null;
  session_type?: string | null;
  ministry_id?: string | null;
  course_id?: string | null;
  day?: string | null;
  show_parking_notice?: boolean;
  service_id?: string | null;
};

export type AdminOptions = {
  courses: { id: string; title: string }[];
  ministries: { id: string; name: string }[];
  services: { id: string; name: string }[];
};

const field =
  "w-full rounded-md border border-border px-3 py-2 text-sm text-foreground";

/** Formulaire repliable pour corriger une séance en cas de changement. */
export default function SessionEditForm({
  session: s,
  defaultOpen = false,
  admin,
}: {
  session: EditableSession;
  defaultOpen?: boolean;
  admin?: AdminOptions;
}) {
  const [state, formAction, pending] = useActionState(updateSessionWithFeedback, null);
  const [category, setCategory] = useState(s.track ?? "Formation du cœur");
  const standardCategories = ["Formation du cœur", "Formation du caractère", "Sensibilité ministérielle", "Mise en pratique", "Services & Projets"];
  return (
    <details className="group mt-2" open={defaultOpen}>
      <summary className="cursor-pointer list-none text-xs font-medium text-link hover:underline">
        Modifier
      </summary>

      <form action={formAction} className="mt-3 max-w-2xl space-y-4">
        <input type="hidden" name="session_id" value={s.id} />

        <label className="block text-sm font-medium text-foreground">Titre du cours<input name="description" defaultValue={s.description ?? ""} className={`${field} mt-1.5`} /></label>

        <label className="block text-sm font-medium text-foreground">Catégorie<select name="track" value={category} onChange={(event) => setCategory(event.target.value)} className={`${field} mt-1.5`}>{s.track && !standardCategories.includes(s.track) && <option value={s.track}>{s.track}</option>}{standardCategories.map((item) => <option key={item}>{item}</option>)}</select></label>

        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr]">
          <label className="block text-sm font-medium text-foreground">Date<input type="date" name="session_date" required defaultValue={s.session_date} className={`${field} mt-1.5`} /></label>
          <label className="block text-sm font-medium text-foreground">Début<input type="time" name="start_time" required defaultValue={s.start_time.slice(0, 5)} className={`${field} mt-1.5`} /></label>
          <label className="block text-sm font-medium text-foreground">Fin<input type="time" name="end_time" required defaultValue={s.end_time.slice(0, 5)} className={`${field} mt-1.5`} /></label>
        </div>

        <input type="hidden" name="location" value={s.location} />
        <div className="grid gap-3 sm:grid-cols-2"><div><p className="text-sm font-medium text-foreground">Lieu</p><p className="mt-1.5 rounded-md bg-surface px-3 py-2.5 text-sm text-muted">{s.location}</p></div><label className="block text-sm font-medium text-foreground">Salle<input name="room" defaultValue={s.room ?? ""} placeholder="Saisir le nom de la salle" className={`${field} mt-1.5`} /></label></div>

        {admin && (
          <>
            <input type="hidden" name="session_type" value={category === "Sensibilité ministérielle" ? "ministere" : "commun"} />
            <input type="hidden" name="course_id" value={s.course_id ?? ""} />
            <input type="hidden" name="day" value={s.day ?? "samedi"} />
            {category === "Sensibilité ministérielle" && <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Sensibilité ministérielle</label>
              <select name="ministry_id" defaultValue={s.ministry_id ?? ""} className={field}>
                <option value="">Choisir une sensibilité</option>
                {admin.ministries.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>}
            {category === "Services & Projets" && <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Service (facultatif)</label>
              <select name="service_id" defaultValue={s.service_id ?? ""} className={field}>
                <option value="">Aucun service associé</option>
                {admin.services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
              </select>
            </div>}
          </>
        )}

        <details className="rounded-md bg-surface px-4 py-3"><summary className="cursor-pointer text-sm font-medium text-foreground">Paramètres complémentaires</summary><div className="mt-4 space-y-4"><label className="block text-sm font-medium text-foreground">Références bibliques<textarea name="bible_refs" rows={3} defaultValue={s.bible_refs ?? ""} className={`${field} mt-1.5`} /></label><label className="flex items-start gap-3 text-sm text-foreground"><input type="hidden" name="show_parking_notice" value="0" /><input type="checkbox" name="show_parking_notice" value="1" defaultChecked={s.show_parking_notice !== false} className="mt-0.5 h-4 w-4 accent-foreground" /><span><strong className="block font-semibold">Afficher l’information parking</strong><span className="text-xs text-muted">Visible sur l’accueil étudiant.</span></span></label></div></details>

        <button
          type="submit"
          disabled={pending}
          className="label rounded-full bg-accent px-5 py-2.5 disabled:opacity-60 text-xs tracking-[0.12em] text-on-accent transition hover:bg-[#1b2221]"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        {state && (
          <p role="status" className={`text-sm sm:col-span-2 ${state.ok ? "text-foreground" : "text-link"}`}>
            {state.ok ? "✓ " : ""}{state.message}
          </p>
        )}
      </form>
      {admin && (
        <form
          action={deleteSessionFromCard}
          onSubmit={(e) => {
            if (!window.confirm("Supprimer définitivement cette séance, avec ses objectifs, devoirs et supports ?")) e.preventDefault();
          }}
          className="mt-3"
        >
          <input type="hidden" name="session_id" value={s.id} />
          <button type="submit" className="text-xs text-link transition hover:underline">Supprimer cette séance</button>
        </form>
      )}
    </details>
  );
}
