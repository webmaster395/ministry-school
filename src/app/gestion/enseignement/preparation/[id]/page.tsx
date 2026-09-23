import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";
import { checklistOf, isAfterClass, progressOf, type PilotSession } from "@/lib/data/pilotage";
import { DRAFT_COLUMN, DRAFTS_ENABLED } from "@/lib/drafts";
import { formatSessionDate, formatTimeRange } from "@/lib/format";
import SessionEditForm from "@/components/SessionEditForm";
import MaterialLink from "@/components/MaterialLink";
import { Segments } from "@/components/PrepBoard";
import { addPilotAssignment, addSupport, publishCourse } from "@/app/gestion/pilotage/actions";

const field = "w-full rounded-md border border-border px-3 py-2 text-sm text-foreground";

type FullSession = PilotSession & { teacher_id: string | null; ministry_id: string | null };

export default async function PreparationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("sessions")
    .select(
      "id, session_date, start_time, end_time, location, room, description, track, speaker_name, summary, objectives, bible_refs, teacher_id, ministry_id, teacher:profiles!sessions_teacher_id_fkey(full_name)" + DRAFT_COLUMN
    )
    .eq("id", id)
    .single();
  const s = data as unknown as FullSession | null;
  if (!s) notFound();

  const canEdit =
    viewer.roles.admin ||
    s.teacher_id === viewer.id ||
    (!!s.ministry_id && viewer.roles.steeringMinistryIds.includes(s.ministry_id));
  if (!canEdit) redirect("/etudiant");

  const [{ data: materials }, { data: assignments }] = await Promise.all([
    supabase.from("materials").select("id, title, link_url, file_url").eq("session_id", id).order("created_at"),
    supabase
      .from("assignments")
      .select("id, instructions, kind, duration_min, due_at")
      .eq("session_id", id)
      .order("created_at"),
  ]);

  const isPilot = !!s.ministry_id && viewer.roles.steeringMinistryIds.includes(s.ministry_id);
  const kind = isPilot ? "pilotage" : "enseignant";
  const afterCount = (assignments ?? []).filter((a) => isAfterClass(a.due_at, s.session_date)).length;
  const items = checklistOf(s, (assignments?.length ?? 0) - afterCount, materials?.length ?? 0, kind, afterCount);
  const progress = progressOf(items);
  const back = isPilot ? "/gestion/pilotage" : "/gestion/enseignement";

  return (
    <div className="space-y-5">
      <Link
        href={back}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ChevronLeft size={16} /> Retour à la préparation
      </Link>

      {DRAFTS_ENABLED && s.is_draft && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background px-5 py-4">
          <p className="text-[15px] text-foreground">
            <strong>Brouillon</strong> — ce cours n&apos;est pas encore visible des étudiants.
          </p>
          <form action={publishCourse}>
            <input type="hidden" name="session_id" value={s.id} />
            <button
              type="submit"
              className="rounded-full bg-accent px-5 py-2.5 text-[15px] font-medium text-on-accent transition hover:bg-[#1b2221]"
            >
              Publier le cours
            </button>
          </form>
        </section>
      )}

      <section className="rounded-lg border border-border bg-background p-6 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            {s.track && <p className="label text-[11px] tracking-[0.14em] text-muted">{s.track}</p>}
            <h2 className="font-title mt-1 text-[26px] leading-tight text-foreground">
              {s.description ?? "À définir"}
            </h2>
            <p className="mt-2 text-[15px] text-muted">
              {formatSessionDate(s.session_date)} · {formatTimeRange(s.start_time, s.end_time)}
            </p>
          </div>
          <div className="w-full max-w-[280px]">
            <p className="text-sm font-semibold text-foreground">
              {progress.completed} éléments complétés sur {progress.total}
            </p>
            <Segments items={items} />
          </div>
        </div>
      </section>

      <section
        id="presentation"
        className="rounded-lg border border-border bg-background p-6"
      >
        <span id="modalites" />
        <span id="enseignant" />
        <span id="objectifs" />
        <h3 className="font-title text-[22px] text-foreground">Informations du cours</h3>
        <p className="text-sm text-muted">
          Modalités, formateur, présentation et objectifs.
        </p>
        <SessionEditForm
          defaultOpen
          session={{ ...s, teacherName: s.teacher?.full_name }}
        />
      </section>

      <span id="apres" />
      <section id="consignes" className="rounded-lg border border-border bg-background p-6">
        <h3 className="font-title text-[22px] text-foreground">À préparer avant le cours</h3>
        <p className="text-sm text-muted">
          Ce que les étudiants doivent faire ou lire avant la séance. Ils le retrouvent dans « Travail à faire ».
        </p>

        {(assignments ?? []).length > 0 && (
          <ul className="mt-3 divide-y divide-border-soft">
            {(assignments ?? []).map((a) => (
              <li key={a.id} className="py-3 text-[15px]">
                <p className="font-medium text-foreground">{a.instructions}</p>
                <p className="text-sm text-muted">
                  {[a.kind, a.duration_min ? `${a.duration_min} min` : null].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        )}

        <form action={addPilotAssignment} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="session_id" value={s.id} />
          <input name="instructions" required placeholder="ex : Lire Jean 15.1–8" className={`${field} sm:col-span-3`} />
          <input name="kind" placeholder="Type (lecture, vidéo…)" className={field} />
          <input type="number" min={1} name="duration_min" placeholder="Durée (min)" className={field} />
          <input type="datetime-local" name="due_at" aria-label="Échéance" className={field} />
          <button
            type="submit"
            className="label rounded-md bg-accent px-4 py-2.5 text-xs tracking-[0.12em] text-on-accent transition hover:bg-[#1b2221] sm:col-span-3 sm:w-fit"
          >
            Ajouter
          </button>
        </form>
      </section>

      <section id="supports" className="rounded-lg border border-border bg-background p-6">
        <h3 className="font-title text-[22px] text-foreground">Supports du cours</h3>
        <p className="text-sm text-muted">
          Liens vers les documents, présentations ou vidéos. Ils sont visibles des étudiants dès l&apos;ajout.
        </p>

        {(materials ?? []).length > 0 && (
          <ul className="mt-3 divide-y divide-border-soft">
            {(materials ?? []).map((m) => (
              <li key={m.id} className="py-3 text-[15px]">
                <MaterialLink title={m.title} url={m.link_url ?? m.file_url} />
              </li>
            ))}
          </ul>
        )}

        <form action={addSupport} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="session_id" value={s.id} />
          <input name="title" required placeholder="Titre du support" className={field} />
          <input type="url" name="link_url" required placeholder="https://…" className={field} />
          <button
            type="submit"
            className="label rounded-md bg-accent px-4 py-2.5 text-xs tracking-[0.12em] text-on-accent transition hover:bg-[#1b2221] sm:col-span-2 sm:w-fit"
          >
            Ajouter le support
          </button>
        </form>
      </section>
    </div>
  );
}
