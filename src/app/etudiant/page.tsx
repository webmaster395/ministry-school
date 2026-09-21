import Link from "next/link";
import { ChevronRight, FileText, Video } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getStudentAllSessions,
  getStudentAssignments,
  getStudentCompletedIds,
  getStudentNewCounts,
  getStudentProfile,
} from "@/lib/data/student";
import { formatSessionDate, formatTimeRange } from "@/lib/format";
import SessionTypeBadge from "@/components/SessionTypeBadge";
import { getMinistry, INK, sessionColor } from "@/lib/ministry";
import { markNotificationsSeen } from "./actions";

export default async function StudentDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { ministrySlug, notificationsSeenAt } = await getStudentProfile(supabase, user!.id);
  const allSessions = await getStudentAllSessions(supabase, user!.id);

  const sessionIds = allSessions.map((s) => s.id);
  const newCounts = await getStudentNewCounts(supabase, sessionIds, notificationsSeenAt);
  const totalNew = newCounts.materials + newCounts.assignments + newCounts.messages;

  const plural = (n: number, singulier: string, pluriel: string) =>
    `${n} ${n > 1 ? pluriel : singulier}`;

  const newsLabel = [
    newCounts.messages > 0 && plural(newCounts.messages, "nouveau message", "nouveaux messages"),
    newCounts.assignments > 0 &&
      plural(newCounts.assignments, "nouvelle consigne", "nouvelles consignes"),
    newCounts.materials > 0 &&
      plural(newCounts.materials, "nouveau document", "nouveaux documents"),
  ]
    .filter(Boolean)
    .join(" · ");

  const today = new Date().toISOString().slice(0, 10);
  const nextSession = allSessions.find((s) => s.session_date >= today);

  const ministryColor = getMinistry(ministrySlug)?.color ?? INK;
  const colorFor = (type: "commun" | "ministere", track?: string | null) =>
    sessionColor(track, type, ministryColor);

  // Toutes les séances de la prochaine journée, dans l'ordre horaire
  const daySessions = nextSession
    ? allSessions.filter((s) => s.session_date === nextSession.session_date)
    : [];
  const daysLeft = nextSession
    ? Math.max(
        0,
        Math.round(
          (new Date(nextSession.session_date).getTime() - new Date(today).getTime()) / 86400000
        )
      )
    : 0;
  const [dayAssignments, doneIds] = await Promise.all([
    getStudentAssignments(
      supabase,
      daySessions.map((s) => s.id)
    ),
    getStudentCompletedIds(supabase, user!.id),
  ]);
  const todo = dayAssignments.filter((a) => !doneIds.has(a.id));
  // L'accueil ne montre que les deux premiers travaux ; « Voir tout » ouvre la liste complète
  const toPrepare = todo.slice(0, 2);
  const todoCount = toPrepare.length;

  return (
    <div className="grid items-start gap-[22px] lg:grid-cols-[1fr_360px]">
      <section className="rounded-lg border border-border bg-background p-7">
        {nextSession ? (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted">Prochaine journée</p>
                <h2 className="font-title mt-1 text-[30px] leading-tight text-foreground">
                  Votre prochaine journée de formation
                </h2>
              </div>
              <span className="label shrink-0 rounded-full bg-surface px-3.5 py-2 text-xs tracking-[0.08em] text-foreground">
                J-{daysLeft}
              </span>
            </div>

            <p className="mt-4 text-lg font-semibold text-foreground">
              {formatSessionDate(nextSession.session_date)}
              <span className="mx-2 text-muted">·</span>
              {formatTimeRange(
                daySessions[0].start_time,
                daySessions[daySessions.length - 1].end_time
              )}
            </p>
            <p className="mt-1 text-[15px] text-muted">
              {nextSession.location}
              {nextSession.room ? ` · ${nextSession.room}` : ""}
            </p>

            <ol className="mt-7">
              {daySessions.map((s, i) => (
                <li key={s.id} className="grid grid-cols-[150px_22px_1fr] gap-x-4">
                  <p className="pt-1 text-[15px] font-semibold text-foreground">
                    {formatTimeRange(s.start_time, s.end_time)}
                  </p>
                  <div className="flex flex-col items-center">
                    <span
                      className="mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-[3px] border-background"
                      style={{
                        background: colorFor(s.session_type, s.track),
                        boxShadow: `0 0 0 2px ${colorFor(s.session_type, s.track)}`,
                      }}
                    />
                    {i < daySessions.length - 1 && <span className="w-px flex-1 bg-border" />}
                  </div>
                  <div className="pb-7">
                    {s.track ? (
                      <span
                        className="label rounded-full px-3 py-1 text-[11px] tracking-[0.1em] text-foreground"
                        style={{
                          background: `color-mix(in srgb, ${colorFor(s.session_type, s.track)} 28%, transparent)`,
                        }}
                      >
                        {s.track}
                      </span>
                    ) : (
                      <SessionTypeBadge type={s.session_type} />
                    )}
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {s.courses?.title ?? s.description ?? "Séance"}
                    </p>
                    {s.teacher && (
                      <p className="mt-0.5 text-sm text-muted">Avec {s.teacher.full_name}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>

            <Link
              href="/etudiant/calendrier"
              className="label mt-2 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3.5 text-xs tracking-[0.12em] text-on-accent hover:bg-[#1b2221]"
            >
              Voir le programme de la journée →
            </Link>
          </>
        ) : (
          <p className="text-sm text-muted">Aucune séance à venir pour le moment.</p>
        )}
      </section>

      <div className="space-y-5">
        <section className="rounded-lg border border-border bg-background p-6">
          <div className="flex items-center gap-2.5">
            <h2 className="font-title text-[22px] text-foreground">Messages</h2>
            {totalNew > 0 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-m-doctoral px-1.5 text-xs font-semibold text-white">
                {totalNew}
              </span>
            )}
          </div>
          <div className="mt-4 border-t border-border-soft pt-4">
            <p className="text-[15px] text-foreground">
              {totalNew > 0 ? newsLabel : "Rien de nouveau pour le moment."}
            </p>
            {totalNew > 0 && (
              <form action={markNotificationsSeen} className="mt-1.5">
                <button
                  type="submit"
                  className="text-[13px] text-muted transition hover:text-foreground"
                >
                  Marquer comme lu
                </button>
              </form>
            )}
          </div>
          <Link
            href="/etudiant/messages"
            className="mt-4 inline-block text-sm font-medium text-foreground hover:underline"
          >
            Voir tous les messages →
          </Link>
        </section>

        <section className="rounded-lg border border-border bg-background p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-title text-[22px] text-foreground">À préparer</h2>
              {nextSession && (
                <p className="mt-1 text-sm text-muted">
                  Avant le {formatSessionDate(nextSession.session_date)}
                </p>
              )}
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-sm font-semibold text-foreground">
              {todoCount}
            </span>
          </div>

          {toPrepare.length ? (
            <ul className="mt-4 divide-y divide-border-soft">
              {toPrepare.map((a) => {
                const Icon = /vid[ée]o/i.test(a.kind ?? "") ? Video : FileText;
                return (
                  <li key={a.id}>
                    <Link
                      href="/etudiant/travail"
                      className="group flex items-center gap-3 py-3.5 text-[15px] text-foreground"
                    >
                      <span className="h-6 w-6 shrink-0 rounded-full border border-border" />
                      <Icon size={18} strokeWidth={1.6} className="shrink-0 text-muted" />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 group-hover:underline">{a.instructions}</span>
                        {a.duration_min && (
                          <span className="block text-xs text-muted">{a.duration_min} min</span>
                        )}
                      </span>
                      <ChevronRight size={16} className="shrink-0 text-muted" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">Rien à préparer pour cette journée.</p>
          )}
          <Link
            href="/etudiant/travail"
            className="mt-3 inline-block text-sm font-medium text-foreground hover:underline"
          >
            Voir tout →
          </Link>
        </section>
      </div>
    </div>
  );
}
