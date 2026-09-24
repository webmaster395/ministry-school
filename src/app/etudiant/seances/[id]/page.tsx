import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  CircleUser,
  Clock,
  FileText,
  Headphones,
  MapPin,
  Video,
} from "lucide-react";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import {
  getStudentAllSessions,
  getStudentAssignments,
  getStudentCompletedIds,
  getStudentMaterials,
  getStudentProfile,
} from "@/lib/data/student";
import { parcoursSlugOf } from "@/lib/data/parcours";
import { toggleAssignment } from "../../travail/actions";

const TRACK_COLORS: Record<string, string> = {
  coeur: "#8b6fc0",
  caractere: "#4a7bc4",
  sensibilite: "#27302f",
};

const lines = (text: string | null | undefined) =>
  (text ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

function formatSessionDateWithYear(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  const formatted = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatHours(start: string, end: string) {
  const f = (t: string) => t.slice(0, 5).replace(/^0/, "").replace(":", " h ").replace(/ h 00$/, " h");
  return `${f(start)}–${f(end)}`;
}

function formatDue(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [sessions, doneIds, { data: me }] = await Promise.all([
    getStudentAllSessions(supabase, user!.id),
    getStudentCompletedIds(supabase, user!.id),
    supabase.from("profiles").select("role, is_teacher").eq("id", user!.id).single(),
  ]);

  const s = sessions.find((x) => x.id === id);
  if (!s) notFound();

  const [materials, assignments] = await Promise.all([
    getStudentMaterials(supabase, [s.id]),
    getStudentAssignments(supabase, [s.id]),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const past = s.session_date < today;

  const parcoursSlug = parcoursSlugOf(s.track);
  const trackColor = parcoursSlug ? (TRACK_COLORS[parcoursSlug] ?? "#27302f") : "#27302f";
  const title = s.courses?.title ?? s.description ?? "Séance";
  const aboutText = s.summary || s.description;
  const objectives = lines(s.objectives);
  const refs = lines(s.bible_refs);
  const place = s.room ? `${s.location} · ${s.room}` : s.location;
  const teacher = s.teacher?.full_name ?? s.speaker_name ?? null;
  const canManage = me?.role === "admin" || me?.is_teacher;

  const backHref = parcoursSlug ? `/etudiant/cours/parcours/${parcoursSlug}` : `/etudiant/cours`;
  const backLabel = parcoursSlug ? "Retour au parcours" : "Retour aux cours";

  return (
    <div className="space-y-6">
      {/* ── Lien de retour ── */}
      <div>
        <BackButton fallbackHref={backHref} fallbackLabel={backLabel} />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        {/* ── Colonne principale ── */}
        <div className="space-y-6">
          {/* ── Carte d'en-tête de la séance ── */}
          <section className="rounded-3xl border border-border bg-background p-7 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              {s.track ? (
                <span
                  className="inline-flex items-center rounded-full px-3.5 py-1 text-[12px] font-semibold"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${trackColor} 18%, transparent)`,
                    color: trackColor,
                  }}
                >
                  {s.track}
                </span>
              ) : (
                <span />
              )}
              <span className="rounded-full bg-surface px-3 py-1 text-[12px] font-medium text-muted">
                {past ? "Passée" : "À venir"}
              </span>
            </div>

            <h1 className="font-title mt-4 text-[30px] sm:text-[34px] font-bold leading-tight text-foreground">
              {title}
            </h1>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-6 border-t border-border-soft pt-5 text-[14px]">
              <div className="flex items-center gap-2.5 text-foreground">
                <CalendarDays size={16} className="text-muted shrink-0" />
                <span>{formatSessionDateWithYear(s.session_date)}</span>
              </div>
              <div className="flex items-center gap-2.5 text-foreground">
                <Clock size={16} className="text-muted shrink-0" />
                <span>{formatHours(s.start_time, s.end_time)}</span>
              </div>
              <div className="flex items-center gap-2.5 text-foreground">
                <MapPin size={16} className="text-muted shrink-0" />
                <span>{place}</span>
              </div>
              <div className="flex items-center gap-2.5 text-foreground">
                <CircleUser size={16} className="text-muted shrink-0" />
                <span>{teacher || "Intervenant à définir"}</span>
              </div>
            </div>
          </section>

          {/* ── Section À propos de ce cours ── */}
          {(aboutText || objectives.length > 0) && (
            <section className="rounded-3xl border border-border bg-background p-7">
              <h2 className="font-title text-[22px] font-bold text-foreground">À propos de ce cours</h2>
              {aboutText && (
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{aboutText}</p>
              )}

              {objectives.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-title text-[17px] font-bold text-foreground">Objectifs</h3>
                  <ul className="mt-3 space-y-2 text-[15px] text-foreground">
                    {objectives.map((obj, i) => (
                      <li key={i} className="pl-1">
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* ── Section Références bibliques ── */}
          {refs.length > 0 && (
            <section className="rounded-3xl border border-border bg-background p-7">
              <h2 className="font-title text-[22px] font-bold text-foreground">Références bibliques</h2>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {refs.map((r) => (
                  <a
                    key={r}
                    href={`https://www.biblegateway.com/passage/?search=${encodeURIComponent(r)}&version=LSG`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-[14px] font-medium text-foreground transition hover:bg-surface hover:border-foreground/30"
                  >
                    <span>{r}</span>
                    <span className="text-muted">→</span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* ── Section Ressources ── */}
          <section className="rounded-3xl border border-border bg-background p-7">
            <h2 className="font-title text-[22px] font-bold text-foreground">Ressources</h2>
            {materials.length ? (
              <>
                <p className="mt-1 text-[13px] text-muted">
                  {materials.length} élément{materials.length > 1 ? "s" : ""} disponible{materials.length > 1 ? "s" : ""}
                </p>
                <ul className="mt-5 divide-y divide-border-soft">
                  {materials.map((m) => {
                    const isVideo =
                      m.file_url?.match(/\.(mp4|mov|webm)$/i) ||
                      m.link_url?.includes("youtube") ||
                      m.link_url?.includes("vimeo");
                    const isAudio = m.file_url?.match(/\.(mp3|wav|m4a)$/i);
                    const isPdf = m.file_url?.endsWith(".pdf");
                    const typeLabel = isVideo ? "Vidéo" : isAudio ? "Audio" : isPdf ? "PDF" : "Document";
                    const actionLabel = isVideo ? "Regarder" : isAudio ? "Écouter" : "Télécharger";

                    return (
                      <li key={m.id} className="flex items-center justify-between gap-4 py-4 first:pt-2">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface">
                            {isVideo ? (
                              <Video size={18} className="text-muted" />
                            ) : isAudio ? (
                              <Headphones size={18} className="text-muted" />
                            ) : (
                              <FileText size={18} className="text-muted" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[15px] text-foreground">{m.title}</p>
                            <p className="text-[12px] text-muted">{typeLabel}</p>
                          </div>
                        </div>
                        {m.file_url || m.link_url ? (
                          <a
                            href={m.file_url ?? m.link_url}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 text-[13px] font-semibold text-foreground hover:underline"
                          >
                            {actionLabel}
                          </a>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">
                Les supports apparaîtront ici quand le formateur les aura publiés.
              </p>
            )}
          </section>

          {/* ── Section Travail associé à ce cours ── */}
          <section className="rounded-3xl border border-border bg-background p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-title text-[22px] font-bold text-foreground">Travail associé à ce cours</h2>
                {assignments.length > 0 && (
                  <p className="mt-1 text-[13px] text-muted">
                    {assignments.length} élément{assignments.length > 1 ? "s" : ""}
                  </p>
                )}
              </div>
              {canManage && (
                <Link
                  href={`/gestion/enseignement/preparation/${s.id}`}
                  className="rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-on-accent transition hover:bg-[#1b2221]"
                >
                  Ajouter un travail
                </Link>
              )}
            </div>

            {assignments.length ? (
              <ul className="mt-5 divide-y divide-border-soft">
                {assignments.map((a) => {
                  const done = doneIds.has(a.id);
                  const meta = [
                    a.kind,
                    a.duration_min ? `${a.duration_min} min` : null,
                    a.due_at ? formatDue(a.due_at) : null,
                  ].filter(Boolean);

                  return (
                    <li key={a.id} className="py-4 first:pt-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <span
                            className="mt-2 h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: trackColor }}
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-[15px] text-foreground">{a.instructions}</p>
                            {meta.length > 0 && (
                              <p className="mt-0.5 text-[12px] text-muted">{meta.join(" · ")}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 sm:self-center">
                          <span className="rounded-full bg-surface px-3 py-1 text-[11px] font-medium text-muted">
                            {done ? "Terminé" : "À préparer"}
                          </span>
                          <form action={toggleAssignment}>
                            <input type="hidden" name="assignment_id" value={a.id} />
                            <input type="hidden" name="done" value={done ? "1" : "0"} />
                            <button
                              type="submit"
                              className="text-[13px] font-medium text-foreground underline underline-offset-2 hover:text-muted transition"
                            >
                              {done ? "Marquer comme non terminé" : "Marquer comme terminé"}
                            </button>
                          </form>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">Aucun travail pour ce cours.</p>
            )}
          </section>
        </div>

        {/* ── Volet latéral : Informations pratiques ── */}
        <aside className="rounded-3xl border border-border bg-background p-6">
          <h2 className="font-title text-[20px] font-bold text-foreground">Informations pratiques</h2>
          <dl className="mt-4 divide-y divide-border-soft">
            <div className="py-3.5 first:pt-0">
              <dt className="text-[12px] text-muted">Date</dt>
              <dd className="mt-1 text-[14px] font-semibold text-foreground">
                {formatSessionDateWithYear(s.session_date)}
              </dd>
            </div>
            <div className="py-3.5">
              <dt className="text-[12px] text-muted">Horaire</dt>
              <dd className="mt-1 text-[14px] font-semibold text-foreground">
                {formatHours(s.start_time, s.end_time)}
              </dd>
            </div>
            {teacher && (
              <div className="py-3.5">
                <dt className="text-[12px] text-muted">Intervenant</dt>
                <dd className="mt-1 text-[14px] font-semibold text-foreground">{teacher}</dd>
              </div>
            )}
            <div className="py-3.5">
              <dt className="text-[12px] text-muted">Lieu</dt>
              <dd className="mt-1 text-[14px] font-semibold text-foreground">{place}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
