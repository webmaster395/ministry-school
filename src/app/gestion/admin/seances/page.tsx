import { createClient } from "@/lib/supabase/server";
import { getAllSessions, getCourses, getMinistries, getTeachers } from "@/lib/data/admin";
import { formatSessionDate, formatTimeRange } from "@/lib/format";
import SessionTypeBadge from "@/components/SessionTypeBadge";
import SessionEditForm from "@/components/SessionEditForm";
import { createSession, deleteSession } from "./actions";
import AdminSelect from "@/components/admin/AdminSelect";
import { getViewer } from "@/lib/data/viewer";
import { redirect } from "next/navigation";

export default async function AdminSessionsPage() {
  const viewer = await getViewer();
  if (!viewer?.roles.superAdmin) redirect("/gestion/admin/programme");
  const supabase = await createClient();
  const [sessions, ministries, teachers, courses] = await Promise.all([
    getAllSessions(supabase),
    getMinistries(supabase),
    getTeachers(supabase),
    getCourses(supabase),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-background p-4 sm:p-6">
        <h2 className="mb-1 label text-xs tracking-[0.18em] text-muted">
          PROGRAMMER UNE SÉANCE
        </h2>
        {/* Guide lieux */}
        <div className="mb-4 rounded-md border border-border bg-foreground/5 p-3 text-xs text-muted space-y-1">
          <p className="font-semibold text-foreground">Rappel — un seul lieu :</p>
          <p>• <strong>Espace Martin Luther King</strong> : plusieurs salles — <strong>Giroud</strong>, <strong>Rosa Parks</strong>, <strong>Denis</strong>. Par défaut, la salle Giroud.</p>
        </div>
        <form action={createSession} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted">Type</label>
            <AdminSelect name="session_type" defaultValue="commun" options={[{value:"commun",label:"Tronc commun"},{value:"ministere",label:"Par ministère"}]} />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Ministère</label>
            <AdminSelect name="ministry_id" options={[{value:"",label:"Tronc commun / non applicable"},...ministries.map((m) => ({value:m.id,label:m.name}))]} searchable />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Cours</label>
            <AdminSelect name="course_id" options={[{value:"",label:"Aucun cours rattaché"},...courses.map((c) => ({value:c.id,label:c.title}))]} searchable />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Intervenant (compte, optionnel)</label>
            <AdminSelect name="teacher_id" options={[{value:"",label:"Non assigné"},...teachers.map((t) => ({value:t.id,label:t.full_name}))]} searchable />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Jour</label>
            <AdminSelect name="day" defaultValue="samedi" options={[{value:"samedi",label:"Samedi"},{value:"dimanche",label:"Dimanche"}]} />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Date</label>
            <input
              type="date"
              name="session_date"
              required
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted">Début</label>
              <input
                type="time"
                name="start_time"
                required
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Fin</label>
              <input
                type="time"
                name="end_time"
                required
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Lieu</label>
            <AdminSelect name="location" defaultValue="Espace Martin Luther King" options={[{value:"Espace Martin Luther King",label:"Espace Martin Luther King"}]} />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">
              Salle <span className="text-muted">(facultatif)</span>
            </label>
            <AdminSelect name="room" options={[{value:"",label:"Aucune salle"},{value:"Giroud",label:"Giroud"},{value:"Rosa Parks",label:"Rosa Parks"},{value:"Denis",label:"Denis"}]} />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-muted">Titre du cours</label>
            <input name="description" required placeholder="ex : La Cuve" className="w-full rounded-md border border-border px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Parcours (pastille de couleur)</label>
            <input
              name="track"
              list="parcours"
              placeholder="ex : Formation du cœur"
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
            <datalist id="parcours">
              <option value="Formation du cœur" />
              <option value="Formation du caractère" />
              <option value="Accélérateur de projet" />
            </datalist>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Intervenant (nom affiché)</label>
            <input name="speaker_name" placeholder="ex : Paul Goulet" className="w-full rounded-md border border-border px-3 py-2 text-sm" />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-muted">Présentation</label>
            <textarea name="summary" rows={3} className="w-full rounded-md border border-border px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Objectifs (un par ligne)</label>
            <textarea name="objectives" rows={4} className="w-full rounded-md border border-border px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Références bibliques (une par ligne, optionnel)</label>
            <textarea name="bible_refs" rows={4} className="w-full rounded-md border border-border px-3 py-2 text-sm" />
          </div>

          <label className="flex items-start gap-3 rounded-md border border-border bg-surface px-3 py-3 text-sm text-foreground sm:col-span-2">
            <input type="hidden" name="show_parking_notice" value="0" />
            <input
              type="checkbox"
              name="show_parking_notice"
              value="1"
              defaultChecked
              className="mt-0.5 h-4 w-4 accent-foreground"
            />
            <span>
              <strong className="block font-semibold">Afficher l’information parking</strong>
              <span className="mt-0.5 block text-xs text-muted">Elle apparaîtra sur l’accueil étudiant avec la prochaine journée.</span>
            </span>
          </label>

          <button
            type="submit"
            className="rounded-md label bg-accent px-4 py-2.5 text-xs tracking-[0.12em] text-on-accent transition hover:bg-[#1b2221] sm:col-span-2 sm:w-fit"
          >
            Programmer la séance
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-border bg-background p-4 sm:p-6">
        <h2 className="mb-4 label text-xs tracking-[0.18em] text-muted">TOUTES LES SÉANCES</h2>
        {sessions.length ? (
          <ul className="divide-y divide-border">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="py-3 text-sm"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex flex-wrap items-center gap-2 text-foreground">
                  {formatSessionDate(s.session_date)}
                  <SessionTypeBadge type={s.session_type} />
                  {s.courses && <span className="font-medium">· {s.courses.title}</span>}
                  {s.ministries && <span className="text-muted">· {s.ministries.name}</span>}
                </span>
                <span className="flex items-center gap-3 text-muted">
                  <span>
                    {formatTimeRange(s.start_time, s.end_time)} · {s.location}
                    {s.room ? ` · ${s.room}` : ""}
                    {s.teacher ? ` · ${s.teacher.full_name}` : ""}
                  </span>
                  <form action={deleteSession}>
                    <input type="hidden" name="session_id" value={s.id} />
                    <button
                      type="submit"
                      className="text-xs text-link transition hover:underline"
                    >
                      Supprimer
                    </button>
                  </form>
                </span>
                </div>
                <SessionEditForm session={{ ...s, teacherName: s.teacher?.full_name }} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Aucune séance.</p>
        )}
      </section>
    </div>
  );
}
