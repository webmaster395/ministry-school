import { createClient } from "@/lib/supabase/server";
import {
  getTeacherAssignments,
  getTeacherMaterials,
  getTeacherSessions,
} from "@/lib/data/teacher";
import { formatSessionDate } from "@/lib/format";
import { addMaterial, addAssignment, shareNow } from "./actions";

export default async function TeacherSupportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const allSessions = await getTeacherSessions(supabase, user!.id);
  const today = new Date().toISOString().slice(0, 10);
  const nextSession = allSessions.filter((s) => s.session_date >= today)[0];
  const sessionIds = allSessions.map((s) => s.id);

  const [materials, assignments] = await Promise.all([
    getTeacherMaterials(supabase, sessionIds),
    getTeacherAssignments(supabase, sessionIds),
  ]);

  if (!allSessions.length) {
    return (
      <section className="rounded-lg border border-border bg-background p-6">
        <p className="text-sm text-muted">Aucune séance assignée pour le moment.</p>
      </section>
    );
  }

  return (
    <>
      <section className="rounded-lg border border-foreground/20 bg-foreground/[0.03] p-6">
        <h2 className="label mb-1 flex items-center gap-2 text-xs tracking-[0.18em] text-foreground">
          <span className="h-2 w-2 rounded-full bg-m-doctoral" />
          PARTAGER EN DIRECT
        </h2>
        <p className="mb-4 text-sm text-muted">
          Visible immédiatement par les étudiants inscrits — utile pendant la séance en cours.
        </p>
        <form action={shareNow} className="grid gap-3 sm:grid-cols-2">
          <select
            name="session_id"
            required
            className="rounded-md border border-border px-3 py-2 text-sm sm:col-span-2"
            defaultValue={nextSession?.id}
          >
            {allSessions.map((s) => (
              <option key={s.id} value={s.id}>
                {formatSessionDate(s.session_date)} · {s.location}
              </option>
            ))}
          </select>
          <input
            name="title"
            required
            placeholder="Titre"
            className="rounded-md border border-border px-3 py-2 text-sm"
          />
          <input
            name="link_url"
            placeholder="Lien (optionnel)"
            className="rounded-md border border-border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md label bg-accent px-4 py-2.5 text-xs tracking-[0.12em] text-on-accent transition hover:bg-[#1b2221] sm:col-span-2 sm:w-fit"
          >
            Partager maintenant
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-border bg-background p-6">
        <h2 className="mb-4 label text-xs tracking-[0.18em] text-muted">
          PUBLIER UN SUPPORT DE COURS
        </h2>
        <form action={addMaterial} className="grid gap-3 sm:grid-cols-2">
          <select
            name="session_id"
            required
            className="rounded-md border border-border px-3 py-2 text-sm sm:col-span-2"
            defaultValue={nextSession?.id}
          >
            {allSessions.map((s) => (
              <option key={s.id} value={s.id}>
                {formatSessionDate(s.session_date)} · {s.location}
              </option>
            ))}
          </select>
          <input
            name="title"
            required
            placeholder="Titre du support"
            className="rounded-md border border-border px-3 py-2 text-sm"
          />
          <input
            name="link_url"
            placeholder="Lien (optionnel)"
            className="rounded-md border border-border px-3 py-2 text-sm"
          />
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-muted">
              Visible pour les étudiants à partir de
            </label>
            <input
              type="datetime-local"
              name="visible_at"
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md label bg-accent px-4 py-2.5 text-xs tracking-[0.12em] text-on-accent transition hover:bg-[#1b2221] sm:col-span-2 sm:w-fit"
          >
            Publier
          </button>
        </form>

        {materials.length > 0 && (
          <ul className="mt-6 divide-y divide-border border-t border-border">
            {materials.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-3 text-sm">
                <span className="text-foreground">{m.title}</span>
                <span className="text-muted">
                  visible dès le{" "}
                  {new Intl.DateTimeFormat("fr-FR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(m.visible_at))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-border bg-background p-6">
        <h2 className="mb-4 label text-xs tracking-[0.18em] text-muted">DONNER UNE CONSIGNE</h2>
        <form action={addAssignment} className="grid gap-3">
          <select
            name="session_id"
            required
            className="rounded-md border border-border px-3 py-2 text-sm"
            defaultValue={nextSession?.id}
          >
            {allSessions.map((s) => (
              <option key={s.id} value={s.id}>
                {formatSessionDate(s.session_date)} · {s.location}
              </option>
            ))}
          </select>
          <textarea
            name="instructions"
            required
            rows={3}
            placeholder="Consigne pour la prochaine séance..."
            className="rounded-md border border-border px-3 py-2 text-sm"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              name="kind"
              placeholder="Type (lecture, vidéo, document…)"
              className="rounded-md border border-border px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={1}
              name="duration_min"
              placeholder="Durée (min)"
              className="rounded-md border border-border px-3 py-2 text-sm"
            />
            <input
              type="datetime-local"
              name="due_at"
              aria-label="Échéance"
              className="rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-fit rounded-md label bg-accent px-4 py-2.5 text-xs tracking-[0.12em] text-on-accent transition hover:bg-[#1b2221]"
          >
            Envoyer
          </button>
        </form>

        {assignments.length > 0 && (
          <ul className="mt-6 space-y-3 border-t border-border pt-4">
            {assignments.map((a) => (
              <li key={a.id} className="text-sm text-foreground">
                {a.instructions}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
