"use client";

import { useActionState } from "react";
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
};

export type AdminOptions = {
  courses: { id: string; title: string }[];
  ministries: { id: string; name: string }[];
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
  return (
    <details className="group mt-2" open={defaultOpen}>
      <summary className="cursor-pointer list-none text-xs font-medium text-link hover:underline">
        Modifier
      </summary>

      <form action={formAction} className="mt-3 grid gap-3 rounded-lg bg-surface p-4 sm:grid-cols-2">
        <input type="hidden" name="session_id" value={s.id} />

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-muted">Titre</label>
          <input name="description" defaultValue={s.description ?? ""} className={field} />
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted">Parcours (pastille)</label>
          <input
            name="track"
            defaultValue={s.track ?? ""}
            placeholder="ex : Formation du cœur"
            className={field}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted">Intervenant</label>
          <input
            name="speaker_name"
            defaultValue={s.speaker_name ?? s.teacherName ?? ""}
            placeholder="Nom de l'intervenant"
            className={field}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted">Date</label>
          <input type="date" name="session_date" required defaultValue={s.session_date} className={field} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted">Début</label>
            <input type="time" name="start_time" required defaultValue={s.start_time.slice(0, 5)} className={field} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Fin</label>
            <input type="time" name="end_time" required defaultValue={s.end_time.slice(0, 5)} className={field} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted">Lieu</label>
          <input name="location" required defaultValue={s.location} className={field} />
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted">Salle</label>
          <input name="room" defaultValue={s.room ?? ""} className={field} />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-muted">À propos de ce cours</label>
          <textarea name="summary" rows={2} defaultValue={s.summary ?? ""} className={field} />
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted">Objectifs (un par ligne)</label>
          <textarea name="objectives" rows={3} defaultValue={s.objectives ?? ""} className={field} />
        </div>

        {admin && (
          <>
            <div>
              <label className="mb-1 block text-xs text-muted">Type de séance</label>
              <select name="session_type" defaultValue={s.session_type ?? "commun"} className={field}>
                <option value="commun">Tronc commun</option>
                <option value="ministere">Par ministère</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Ministère (si par ministère)</label>
              <select name="ministry_id" defaultValue={s.ministry_id ?? ""} className={field}>
                <option value="">— Aucun —</option>
                {admin.ministries.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Cours rattaché</label>
              <select name="course_id" defaultValue={s.course_id ?? ""} className={field}>
                <option value="">— Aucun cours rattaché —</option>
                {admin.courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Jour</label>
              <select name="day" defaultValue={s.day ?? "samedi"} className={field}>
                <option value="samedi">Samedi</option>
                <option value="dimanche">Dimanche</option>
              </select>
            </div>
          </>
        )}

        <div>
          <label className="mb-1 block text-xs text-muted">Références bibliques (une par ligne, ex : Jean 15:1-8)</label>
          <textarea name="bible_refs" rows={3} defaultValue={s.bible_refs ?? ""} className={field} />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="label rounded-md bg-accent px-4 py-2.5 disabled:opacity-60 text-xs tracking-[0.12em] text-on-accent transition hover:bg-[#1b2221] sm:col-span-2 sm:w-fit"
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
