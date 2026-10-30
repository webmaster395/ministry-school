"use client";

import { useActionState, useState } from "react";
import { CalendarDays, MapPin, Settings2, UserRound } from "lucide-react";
import { deleteSessionFromCard, updateSessionWithFeedback } from "@/lib/actions/sessions";
import AdminSelect from "@/components/admin/AdminSelect";

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
  "min-h-11 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-foreground";

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
  const fixedMinistrySchedule = s.session_type === "ministere" && !admin;
  const standardCategories = ["Formation du cœur", "Formation du caractère", "Sensibilité ministérielle", "Mise en pratique"];
  return (
    <details className="group" open={defaultOpen}>
      <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:border-foreground">
        <Settings2 size={16} /> Modifier les informations
      </summary>

      <form action={formAction} className="mt-4 max-w-4xl space-y-4">
        <input type="hidden" name="session_id" value={s.id} />

        <fieldset className="rounded-2xl border border-border bg-surface/40 p-4 sm:p-5">
          <legend className="px-2 text-sm font-semibold text-foreground">Informations générales</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-foreground sm:col-span-2">Titre du cours <span className="text-link">*</span><input name="description" required defaultValue={s.description ?? ""} className={`${field} mt-1.5`} /></label>
            <label className="block text-sm font-medium text-foreground">Catégorie<AdminSelect name="track" value={category} onValueChange={setCategory} className="mt-1.5" options={[...(s.track && !standardCategories.includes(s.track) ? [{ value: s.track, label: s.track }] : []), ...standardCategories.map((item) => ({ value: item, label: item }))]} /></label>
            <label className="block text-sm font-medium text-foreground">Intervenant affiché <span className="font-normal text-muted">(facultatif)</span><span className="relative block"><UserRound size={16} className="pointer-events-none absolute left-3.5 top-5 text-muted" /><input name="speaker_name" defaultValue={s.speaker_name ?? ""} placeholder="Un ou plusieurs noms" className={`${field} mt-1.5 pl-10`} /></span></label>
          </div>
        </fieldset>

        <fieldset className="rounded-2xl border border-border bg-surface/40 p-4 sm:p-5">
          <legend className="inline-flex items-center gap-2 px-2 text-sm font-semibold text-foreground"><CalendarDays size={16} /> Date et horaires</legend>
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr]">
            <label className="block text-sm font-medium text-foreground">Date <span className="text-link">*</span><input type="date" name="session_date" min={fixedMinistrySchedule ? "2027-01-01" : undefined} required defaultValue={s.session_date} className={`${field} mt-1.5`} /></label>
            {fixedMinistrySchedule ? <><input type="hidden" name="start_time" value="10:30" /><input type="hidden" name="end_time" value="13:00" /><div className="sm:col-span-2"><p className="text-sm font-medium text-foreground">Horaire ministériel</p><p className="mt-1.5 min-h-11 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-muted">10 h 30 – 13 h</p></div></> : <><label className="block text-sm font-medium text-foreground">Début <span className="text-link">*</span><input type="time" name="start_time" required defaultValue={s.start_time.slice(0, 5)} className={`${field} mt-1.5`} /></label><label className="block text-sm font-medium text-foreground">Fin <span className="text-link">*</span><input type="time" name="end_time" required defaultValue={s.end_time.slice(0, 5)} className={`${field} mt-1.5`} /></label></>}
          </div>
        </fieldset>

        <fieldset className="rounded-2xl border border-border bg-surface/40 p-4 sm:p-5">
          <legend className="inline-flex items-center gap-2 px-2 text-sm font-semibold text-foreground"><MapPin size={16} /> Lieu</legend>
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium text-foreground">Lieu et adresse <span className="text-link">*</span><input name="location" required defaultValue={s.location} className={`${field} mt-1.5`} /></label><label className="block text-sm font-medium text-foreground">Salle <span className="font-normal text-muted">(facultatif)</span><input name="room" defaultValue={s.room ?? ""} placeholder="Ex. Giroud" className={`${field} mt-1.5`} /></label></div>
        </fieldset>

        {admin && (
          <>
            <input type="hidden" name="session_type" value={category === "Sensibilité ministérielle" ? "ministere" : "commun"} />
            <input type="hidden" name="course_id" value={s.course_id ?? ""} />
            <input type="hidden" name="day" value={s.day ?? "samedi"} />
            {category === "Sensibilité ministérielle" && <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Sensibilité ministérielle</label>
              <AdminSelect name="ministry_id" defaultValue={s.ministry_id ?? ""} placeholder="Choisir une sensibilité" options={admin.ministries.map((m) => ({ value: m.id, label: m.name }))} searchable />
            </div>}
          </>
        )}

        <details className="rounded-2xl border border-border bg-surface/40 px-4 py-3"><summary className="cursor-pointer text-sm font-semibold text-foreground">Paramètres complémentaires</summary><div className="mt-4 space-y-4"><label className="block text-sm font-medium text-foreground">Références bibliques<textarea name="bible_refs" rows={3} defaultValue={s.bible_refs ?? ""} className={`${field} mt-1.5 resize-y`} /></label><label className="flex items-start gap-3 rounded-xl bg-background px-4 py-3 text-sm text-foreground"><input type="hidden" name="show_parking_notice" value="0" /><input type="checkbox" name="show_parking_notice" value="1" defaultChecked={s.show_parking_notice !== false} className="mt-0.5 h-4 w-4 accent-foreground" /><span><strong className="block font-semibold">Afficher l’information parking</strong><span className="text-xs text-muted">Visible avec les informations pratiques.</span></span></label></div></details>

        <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-border bg-background/95 px-4 py-3 shadow-lg backdrop-blur"><button type="submit" disabled={pending} className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent transition hover:bg-[#1b2221] disabled:opacity-60">{pending ? "Enregistrement…" : "Enregistrer les informations"}</button>{state && <p role="status" className={`w-full text-right text-sm ${state.ok ? "text-foreground" : "text-link"}`}>{state.ok ? "✓ " : ""}{state.message}</p>}</div>
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
