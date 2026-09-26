import { TYPE_COLUMN } from "@/lib/material-types";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, Clock, MapPin, UserCircle } from "lucide-react";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";
import { checklistOf, isAfterClass, progressOf, type PilotSession } from "@/lib/data/pilotage";
import { DRAFT_COLUMN, DRAFTS_ENABLED } from "@/lib/drafts";
import { formatSessionDate, formatTimeRangeFr } from "@/lib/format";
import { sessionColor } from "@/lib/ministry";
import SessionEditForm from "@/components/SessionEditForm";
import { teacherPanels } from "@/components/gestion/TeacherPanels";
import { publishCourse } from "@/app/gestion/pilotage/actions";

type FullSession = PilotSession & { teacher_id: string | null; ministry_id: string | null };

const SECTIONS = ["presentation", "objectifs", "consignes", "supports", "apres"] as const;

export default async function PreparationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("sessions")
    .select(
      "id, session_date, start_time, end_time, location, room, description, track, speaker_name, summary, objectives, bible_refs, session_type, course_id, day, teacher_id, ministry_id, teacher:profiles!sessions_teacher_id_fkey(full_name)" + DRAFT_COLUMN
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
    supabase.from("materials").select("id, title, link_url, file_url, visible_at" + TYPE_COLUMN).eq("session_id", id).order("created_at"),
    supabase
      .from("assignments")
      .select("id, instructions, kind, duration_min, due_at")
      .eq("session_id", id)
      .order("created_at"),
  ]);

  // L'administrateur a la vue du pilotage sur tous les ministères, sans être limité au sien
  const adminOptions = viewer.roles.admin
    ? {
        courses: ((await supabase.from("courses").select("id, title").order("title")).data ?? []) as { id: string; title: string }[],
        ministries: ((await supabase.from("ministries").select("id, name").order("name")).data ?? []) as { id: string; name: string }[],
      }
    : undefined;
  const isPilot = viewer.roles.admin || (!!s.ministry_id && viewer.roles.steeringMinistryIds.includes(s.ministry_id));
  const kind = isPilot ? "pilotage" : "enseignant";
  const afterCount = (assignments ?? []).filter((a) => isAfterClass(a.due_at, s.session_date)).length;
  const items = checklistOf(s, (assignments?.length ?? 0) - afterCount, materials?.length ?? 0, kind, afterCount);
  const progress = progressOf(items);
  const back = viewer.roles.admin ? "/gestion/admin?onglet=programme" : isPilot ? "/gestion/pilotage" : "/gestion/enseignement";
  const backLabel = viewer.roles.admin ? "Retour au programme" : isPilot ? "Retour à la préparation" : "Retour à l'Espace formateur";
  const panels = teacherPanels(s, assignments ?? [], materials ?? []);
  const color = sessionColor(s.track, "commun", "#1d2625");
  const teacher = s.speaker_name ?? s.teacher?.full_name;
  const isDraft = DRAFTS_ENABLED && !!s.is_draft;

  return (
    <div className="space-y-4">
      <BackButton fallbackHref={back} fallbackLabel={backLabel} />

      <section className="rounded-2xl border bg-background p-6 sm:p-7" style={{ borderColor: color }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          {s.track ? (
            <span
              className="label rounded-full px-3.5 py-1.5 text-[12px] tracking-[0.06em] text-foreground"
              style={{ background: `color-mix(in srgb, ${color} 35%, transparent)` }}
            >
              {s.track}
            </span>
          ) : (
            <span />
          )}
          <span
            className={`label rounded-full px-3.5 py-1.5 text-[11px] tracking-[0.1em] ${
              progress.ready ? "bg-surface text-foreground" : "bg-m-doctoral/[0.12] text-link"
            }`}
          >
            {isDraft ? "Brouillon" : progress.ready ? "Prêt" : "À compléter"}
          </span>
        </div>
        <h2 className="font-title mt-4 text-[30px] leading-tight" style={{ color }}>
          {s.description ?? "À définir"}
        </h2>
        <p className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px] text-muted">
          <span className="inline-flex items-center gap-2">
            <CalendarDays size={17} strokeWidth={1.6} /> {formatSessionDate(s.session_date)} {s.session_date.slice(0, 4)}
          </span>
          <span className="inline-flex items-center gap-2">
            <Clock size={17} strokeWidth={1.6} /> {formatTimeRangeFr(s.start_time, s.end_time)}
          </span>
          <span className="inline-flex items-center gap-2">
            <MapPin size={17} strokeWidth={1.6} /> {s.location}
            {s.room ? ` · ${s.room}` : ""}
          </span>
          {teacher && (
            <span className="inline-flex items-center gap-2">
              <UserCircle size={17} strokeWidth={1.6} /> {teacher}
            </span>
          )}
        </p>
      </section>

      {isPilot && (
        <section className="rounded-2xl border border-border bg-background">
          <div className="border-b border-border-soft px-6 py-5">
            <h3 className="font-title text-[20px] text-foreground">Informations du cours</h3>
            <p className="text-sm text-muted">Date, horaire, lieu et formateur.</p>
          </div>
          <div className="px-6 pb-6 pt-2">
            <SessionEditForm session={{ ...s, teacherName: s.teacher?.full_name }} admin={adminOptions} />
          </div>
        </section>
      )}

      {SECTIONS.map((key) => {
        const it = items.find((i) => i.key === key)!;
        return (
          <section key={key} id={key} className="scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-background">
            <div className="border-b border-border-soft px-6 py-5">
              <h3 className="font-title text-[20px] text-foreground">{it.label}</h3>
              <p className="text-sm text-muted">{it.done ? it.detail : it.required ? "À compléter" : it.detail}</p>
            </div>
            <div className="px-6 py-5">{panels[key]}</div>
          </section>
        );
      })}

      <div className="sticky bottom-3 z-30 rounded-2xl border border-border bg-background/95 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
          <span className="text-[14px] text-muted">
            {progress.completed} élément{progress.completed > 1 ? "s" : ""} complété{progress.completed > 1 ? "s" : ""} sur {progress.total}
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/etudiant/seances/${s.id}`}
              className="rounded-full border border-border bg-surface px-5 py-2.5 text-[15px] text-foreground transition hover:border-foreground"
            >
              Voir comme un étudiant
            </Link>
            {isDraft && (
              <form action={publishCourse}>
                <input type="hidden" name="session_id" value={s.id} />
                <button
                  type="submit"
                  className="rounded-full bg-accent px-5 py-2.5 text-[15px] font-medium text-on-accent transition hover:bg-[#1b2221]"
                >
                  Publier le cours
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
