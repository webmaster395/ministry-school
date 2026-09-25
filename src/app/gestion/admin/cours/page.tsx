import { createClient } from "@/lib/supabase/server";
import { getCourses, getMinistries } from "@/lib/data/admin";
import { createCourse, deleteCourse } from "./actions";

export default async function AdminCoursesPage() {
  const supabase = await createClient();
  const [courses, ministries] = await Promise.all([
    getCourses(supabase),
    getMinistries(supabase),
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-background p-4 sm:p-6">
        <h2 className="mb-1 label text-xs tracking-[0.18em] text-muted">CRÉER UN COURS</h2>
        <p className="mb-4 text-sm text-muted">
          Un cours regroupe plusieurs séances. Il est ensuite rattaché aux séances depuis
          l&apos;onglet Séances.
        </p>

        <form action={createCourse} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted">Intitulé</label>
            <input
              type="text"
              name="title"
              required
              placeholder="Fondements du prophétique"
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted">Ministère</label>
            <select
              name="ministry_id"
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            >
              <option value="">— Tronc commun / non applicable —</option>
              {ministries.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-muted">Description</label>
            <textarea
              name="description"
              rows={2}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-muted">
              Objectifs — un par ligne
            </label>
            <textarea
              name="objectives"
              rows={3}
              placeholder={"Comprendre…\nDistinguer…\nIdentifier…"}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            className="rounded-md label bg-accent px-4 py-2.5 text-xs tracking-[0.12em] text-on-accent transition hover:bg-[#1b2221] sm:col-span-2 sm:w-fit"
          >
            Créer le cours
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-border bg-background p-4 sm:p-6">
        <h2 className="mb-4 label text-xs tracking-[0.18em] text-muted">TOUS LES COURS</h2>
        {courses.length ? (
          <ul className="divide-y divide-border">
            {courses.map((c) => (
              <li key={c.id} className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-foreground">{c.title}</p>
                  <span className="flex items-center gap-3 text-sm text-muted">
                    {c.ministries?.name ?? "Tronc commun"}
                    <form action={deleteCourse}>
                      <input type="hidden" name="course_id" value={c.id} />
                      <button
                        type="submit"
                        className="text-xs text-link transition hover:underline"
                      >
                        Supprimer
                      </button>
                    </form>
                  </span>
                </div>
                {c.description && <p className="mt-1 text-sm text-muted">{c.description}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Aucun cours créé pour le moment.</p>
        )}
      </section>
    </div>
  );
}
