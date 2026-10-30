import { TYPE_COLUMN } from "@/lib/material-types";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, Clock, MapPin, UserCircle } from "lucide-react";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";
import {
  checklistOf,
  isAfterClass,
  progressOf,
  type PilotSession,
} from "@/lib/data/pilotage";
import { DRAFT_COLUMN, DRAFTS_ENABLED } from "@/lib/drafts";
import { formatSessionDate, formatTimeRangeFr } from "@/lib/format";
import { sessionColor } from "@/lib/ministry";
import SessionEditForm from "@/components/SessionEditForm";
import { teacherPanels } from "@/components/gestion/TeacherPanels";
import TrainerMultiSelect, {
  type TrainerChoice,
} from "@/components/gestion/TrainerMultiSelect";
import MinistryCourseReviewPanel from "@/components/MinistryCourseReviewPanel";
import { getMinistryCourseReviewState } from "@/lib/data/ministry-course-review";
import { createMinistryCourseRevision } from "@/app/gestion/a-valider/actions";

type FullSession = PilotSession & {
  session_type: "commun" | "ministere";
  teacher_id: string | null;
  ministry_id: string | null;
  service_id: string | null;
  opportunity_id: string | null;
};

const SECTIONS = [
  "presentation",
  "objectifs",
  "consignes",
  "video",
  "supports",
  "apres",
] as const;
const SECTION_LABELS = {
  presentation: "À propos",
  objectifs: "Objectifs",
  video: "Vidéo",
  consignes: "À faire avant",
  supports: "Ressources",
  apres: "À faire après",
} as const;

export default async function PreparationPage(props: { params: Promise<{ id: string }> }) {
  return PreparationPageContent({ ...props, accessMode: "administration" });
}

export async function PreparationPageContent({
  params,
  accessMode,
  opportunityId,
}: {
  params: Promise<{ id: string }>;
  accessMode: "administration" | "pilotage" | "opportunity";
  opportunityId?: string;
}) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("sessions")
    .select(
      "id, session_date, start_time, end_time, location, room, description, track, speaker_name, summary, objectives, bible_refs, show_parking_notice, session_type, course_id, day, teacher_id, ministry_id, service_id, opportunity_id, editorial_status, publication_at, revision_of, teacher:profiles!sessions_teacher_id_fkey(full_name)" +
        DRAFT_COLUMN,
    )
    .eq("id", id)
    .single();
  if (!data) notFound();
  const { data: video } = await supabase
    .from("session_videos")
    .select("url, visible_at")
    .eq("session_id", id)
    .maybeSingle();
  const s = {
    ...(data as unknown as FullSession),
    video_url: video?.url ?? null,
    video_visible_at: video?.visible_at ?? null,
  };

  const { data: trainerLinks } = await supabase
    .from("session_trainers")
    .select(
      "trainer_id, position, trainer:trainers(id, profile_id, first_name, last_name, title, photo_path)",
    )
    .eq("session_id", id)
    .order("position");
  const strictPilot = s.session_type === "ministere" &&
      !!s.ministry_id &&
      viewer.roles.steeringMinistryIds.includes(s.ministry_id);
  const { data: scopedCanEdit } = accessMode !== "administration"
    ? await supabase.rpc("can_edit_ministry_course", { p_session: id })
    : { data: false };
  const { data: managedCanView } = accessMode === "opportunity"
    ? await supabase.rpc("can_view_managed_course", { p_session: id })
    : { data: false };
  const canView = accessMode === "pilotage"
    ? strictPilot
    : accessMode === "opportunity"
      ? !!managedCanView && !!s.opportunity_id && s.opportunity_id === opportunityId
      : viewer.roles.admin;
  const canEdit = accessMode === "pilotage"
    ? !!scopedCanEdit
    : accessMode === "opportunity"
      ? !!scopedCanEdit
      : viewer.roles.superAdmin;
  if (!canView) redirect("/etudiant");

  const [{ data: materials }, { data: assignments }] = await Promise.all([
    supabase
      .from("materials")
      .select(
        "id, title, description, sort_order, link_url, file_url, visible_at" +
          TYPE_COLUMN,
      )
      .eq("session_id", id)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("assignments")
      .select(
        "id, title, description, instructions, content_type, resource_url, file_url, phase, sort_order, kind, duration_min, due_at, visible_at",
      )
      .eq("session_id", id)
      .order("created_at"),
  ]);
  const assignmentIds = (assignments ?? []).map((assignment) => assignment.id);
  const { data: assignmentSteps } = assignmentIds.length
    ? await supabase
        .from("assignment_steps")
        .select("id, assignment_id, title, instructions, sort_order")
        .in("assignment_id", assignmentIds)
        .order("sort_order")
    : { data: [] };

  // Les options globales restent réservées à la vue Administration.
  const adminOptions = accessMode === "administration" && viewer.roles.superAdmin
    ? {
        courses: ((
          await supabase.from("courses").select("id, title").order("title")
        ).data ?? []) as { id: string; title: string }[],
        ministries: ((
          await supabase.from("ministries").select("id, name").order("name")
        ).data ?? []) as { id: string; name: string }[],
        services: ((await supabase.from("services").select("id, name").order("name")).data ?? []) as { id: string; name: string }[],
      }
    : undefined;
  const isPilot = s.session_type === "ministere" && (viewer.roles.admin || strictPilot);
  const kind = isPilot ? "pilotage" : "enseignant";
  const afterCount = (assignments ?? []).filter((a) =>
    isAfterClass(a.due_at, s.session_date),
  ).length;
  const items = checklistOf(
    s,
    (assignments?.length ?? 0) - afterCount,
    materials?.length ?? 0,
    kind,
    afterCount,
  );
  const progress = progressOf(items);
  const back = accessMode === "pilotage"
    ? "/gestion/pilotage"
    : accessMode === "opportunity" && s.opportunity_id
    ? `/gestion/projets-formations/${s.opportunity_id}`
    : viewer.roles.admin
    ? "/gestion/admin?onglet=programme"
    : isPilot
      ? "/gestion/pilotage"
      : "/gestion/enseignement";
  const backLabel = accessMode === "pilotage"
    ? "Retour à la préparation"
    : accessMode === "opportunity"
    ? "Retour au projet ou à la formation"
    : viewer.roles.admin
    ? "Retour au programme"
    : isPilot
      ? "Retour à la préparation"
      : "Retour à l’espace d’enseignement";
  const panels = teacherPanels(
    s,
    assignments ?? [],
    materials ?? [],
    assignmentSteps ?? [],
  );
  const color = sessionColor(s.track, "commun", "#1d2625");
  const teacher = s.speaker_name ?? s.teacher?.full_name;
  const isDraft = DRAFTS_ENABLED && !!s.is_draft;
  const reviewState = s.session_type === "ministere" || !!s.opportunity_id
    ? await getMinistryCourseReviewState(supabase, s.id)
    : null;
  const statusLabel = reviewState
    ? ({
        draft: "Brouillon",
        pending: "En attente",
        changes_requested: "À corriger",
        scheduled: "Programmé",
        published: "Publié",
        superseded: "Version remplacée",
      } as const)[reviewState.status]
    : isDraft ? "Brouillon" : progress.ready ? "Prêt" : "À compléter";
  const { data: trainerRows } = await supabase
    .from("trainers")
    .select("id, first_name, last_name, title, photo_path")
    .eq("is_active", true)
    .order("last_name");
  const trainers: TrainerChoice[] = (trainerRows ?? []).map((trainer) => ({
    id: trainer.id,
    name: `${trainer.first_name} ${trainer.last_name}`.trim(),
    title: trainer.title,
    photoUrl: trainer.photo_path
      ? supabase.storage.from("trainer-photos").getPublicUrl(trainer.photo_path)
          .data.publicUrl
      : null,
  }));
  const selectedTrainerIds = (trainerLinks ?? []).map(
    (link) => link.trainer_id as string,
  );

  return (
    <div className="space-y-4">
      <BackButton fallbackHref={back} fallbackLabel={backLabel} />

      <section
        className="rounded-2xl border bg-background p-6 sm:p-7"
        style={{ borderColor: color }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          {s.track ? (
            <span
              className="label rounded-full px-3.5 py-1.5 text-[12px] tracking-[0.06em] text-foreground"
              style={{
                background: `color-mix(in srgb, ${color} 35%, transparent)`,
              }}
            >
              {s.track}
            </span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Link href={`/etudiant/seances/${s.id}`} className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground">Aperçu étudiant</Link>
            <span className={`label rounded-full px-3.5 py-1.5 text-[11px] tracking-[0.1em] ${progress.ready ? "bg-surface text-foreground" : "bg-m-doctoral/[0.12] text-link"}`}>
              {statusLabel}
            </span>
          </div>
        </div>
        <h2
          className="font-title mt-4 text-[30px] leading-tight"
          style={{ color }}
        >
          {s.description ?? "À définir"}
        </h2>
        <p className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px] text-muted">
          <span className="inline-flex items-center gap-2">
            <CalendarDays size={17} strokeWidth={1.6} />{" "}
            {formatSessionDate(s.session_date)} {s.session_date.slice(0, 4)}
          </span>
          <span className="inline-flex items-center gap-2">
            <Clock size={17} strokeWidth={1.6} />{" "}
            {formatTimeRangeFr(s.start_time, s.end_time)}
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

      {reviewState && <MinistryCourseReviewPanel sessionId={s.id} state={reviewState} />}

      {reviewState?.canSubmit && accessMode === "pilotage" && (reviewState.status === "published" || reviewState.status === "scheduled") && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-5">
          <div><h3 className="font-title text-[19px]">Modifier sans toucher à la version visible</h3><p className="mt-1 text-sm text-muted">Créez un nouveau brouillon reprenant le cours et ses contenus. La version actuelle restera accessible jusqu’à la prochaine validation.</p></div>
          <form action={createMinistryCourseRevision}><input type="hidden" name="session_id" value={s.id} /><button className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent">Créer une nouvelle version</button></form>
        </section>
      )}

      {canEdit && (
        <section className="rounded-2xl border border-border bg-background">
          <div className="border-b border-border-soft px-6 py-5">
            <h3 className="font-title text-[20px] text-foreground">
              Informations du cours
            </h3>
            <p className="text-sm text-muted">
              Date, horaire, lieu et intervenant.
            </p>
          </div>
          <div className="px-6 pb-6 pt-2">
            <SessionEditForm
              session={{ ...s, teacherName: s.teacher?.full_name }}
              defaultOpen
              admin={adminOptions}
            />
          </div>
        </section>
      )}

      {canEdit && (
        <section className="rounded-2xl border border-border bg-background">
          <div className="border-b border-border-soft px-6 py-5">
            <h3 className="font-title text-[20px] text-foreground">
              Intervenants de la séance
            </h3>
            <p className="text-sm text-muted">
              Sélectionne une ou plusieurs personnes depuis l’annuaire
              centralisé.
            </p>
          </div>
          <div className="px-6 py-5">
            <TrainerMultiSelect
              sessionId={s.id}
              trainers={trainers}
              selectedIds={selectedTrainerIds}
            />
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-border bg-background">
        <div className="border-b border-border px-5 py-5 sm:px-6">
          <h3 className="font-title text-[22px] text-foreground">
            Contenu pédagogique
          </h3>
          <p className="mt-1 text-sm text-muted">
            Construis le parcours dans l’ordre où l’étudiant le découvrira.
          </p>
          <nav
            aria-label="Sections de préparation du cours"
            className="mt-4 flex gap-2 overflow-x-auto pb-1"
          >
            {SECTIONS.map((section, index) => (
              <a
                key={section}
                href={`#${section}`}
                className="min-h-10 shrink-0 rounded-full border border-border px-3.5 py-2.5 text-sm text-foreground transition hover:border-foreground hover:bg-surface"
              >
                <span className="mr-1.5 text-xs text-muted">{index + 1}.</span>
                {SECTION_LABELS[section]}
              </a>
            ))}
          </nav>
        </div>
        {SECTIONS.map((key, index) => {
          const it = items.find((i) => i.key === key) ?? {
            key,
            label: SECTION_LABELS[key],
            detail: "",
            done: !!s.video_url,
            required: false,
          };
          return (
            <article
              key={key}
              id={key}
              className={`scroll-mt-24 px-5 py-7 sm:px-6 sm:py-8 ${index > 0 ? "border-t border-border-soft" : ""}`}
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-semibold text-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h4 className="font-title text-[20px] text-foreground">
                    {SECTION_LABELS[key]}
                  </h4>
                </div>
                {(it.done || it.required) && (
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${it.done ? "bg-surface text-muted" : "bg-amber-100 text-amber-900"}`}
                  >
                    {it.done ? "Renseigné" : "À compléter"}
                  </span>
                )}
              </div>
              {canEdit ? panels[key] : <ReadOnlySection section={key} session={s} assignments={(assignments ?? []) as unknown as Parameters<typeof ReadOnlySection>[0]["assignments"]} materials={(materials ?? []) as unknown as Parameters<typeof ReadOnlySection>[0]["materials"]} />}
            </article>
          );
        })}
      </section>

      <div className="app-sticky-action sticky bottom-3 z-30 rounded-2xl border border-border bg-background/95 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
          <span className="text-[14px] text-muted">
            {progress.completed} élément{progress.completed > 1 ? "s" : ""}{" "}
            complété{progress.completed > 1 ? "s" : ""} sur {progress.total}
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/etudiant/seances/${s.id}`}
              className="rounded-full border border-border bg-surface px-5 py-2.5 text-[15px] text-foreground transition hover:border-foreground"
            >
              Voir comme un étudiant
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReadOnlySection({ section, session, assignments, materials }: {
  section: typeof SECTIONS[number];
  session: FullSession & { video_url: string | null; video_visible_at: string | null };
  assignments: { id: string; title: string; description: string | null; instructions: string | null; phase: string | null; due_at: string | null }[];
  materials: { id: string; title: string; description: string | null; link_url: string | null; file_url: string | null }[];
}) {
  if (section === "presentation") return <p className="whitespace-pre-wrap text-sm leading-6 text-muted">{session.summary || "Aucune présentation renseignée."}</p>;
  if (section === "objectifs") return <p className="whitespace-pre-wrap text-sm leading-6 text-muted">{session.objectives || "Aucun objectif renseigné."}</p>;
  if (section === "video") return session.video_url ? <a className="text-sm font-medium text-link underline underline-offset-4" href={session.video_url} target="_blank" rel="noreferrer">Consulter la vidéo</a> : <p className="text-sm text-muted">Aucune vidéo renseignée.</p>;
  if (section === "supports") return materials.length ? <ul className="space-y-2">{materials.map((item) => <li key={item.id} className="rounded-xl bg-surface px-4 py-3 text-sm"><strong>{item.title}</strong>{item.description && <p className="mt-1 text-muted">{item.description}</p>}</li>)}</ul> : <p className="text-sm text-muted">Aucune ressource renseignée.</p>;
  const phase = section === "apres" ? "after" : "before";
  const rows = assignments.filter((item) => item.phase === phase || (!item.phase && section === "consignes"));
  return rows.length ? <ul className="space-y-2">{rows.map((item) => <li key={item.id} className="rounded-xl bg-surface px-4 py-3 text-sm"><strong>{item.title}</strong>{(item.instructions || item.description) && <p className="mt-1 whitespace-pre-wrap text-muted">{item.instructions || item.description}</p>}</li>)}</ul> : <p className="text-sm text-muted">Aucun élément renseigné.</p>;
}
