import Link from "next/link";
import { Bell, ChevronRight, FileText, Video } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getStudentAllSessions,
  getStudentAssignments,
  getStudentCompletedIds,
  getStudentProfile,
} from "@/lib/data/student";
import { formatSessionDate, formatTimeRange } from "@/lib/format";
import SessionTypeBadge from "@/components/SessionTypeBadge";
import { getStudentMessages, shortDate } from "@/lib/data/messages";
import { getMinistry, INK, sessionColor } from "@/lib/ministry";
import { FIRST_DAY } from "@/lib/promotion";
import { markNotificationsSeen } from "./actions";

export default async function StudentDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { ministrySlug, notificationsSeenAt } = await getStudentProfile(supabase, user!.id);
  const allSessions = await getStudentAllSessions(supabase, user!.id);

  // Messages des enseignants uniquement : le travail à faire a sa propre carte et sa propre page
  const messages = await getStudentMessages(supabase, notificationsSeenAt);
  const newCount = messages.filter((m) => m.isNew).length;
  const preview = messages.slice(0, 2);

  // Date du jour à Paris (et non en UTC), pour que le décompte change bien à minuit heure de Paris
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
  const nextSession = allSessions.find((s) => s.session_date >= today);

  const ministryColor = getMinistry(ministrySlug)?.color ?? INK;
  const colorFor = (type: "commun" | "ministere", track?: string | null) =>
    sessionColor(track, type, ministryColor);

  // Toutes les séances de la prochaine journée, dans l'ordre horaire
  const daySessions = nextSession
    ? allSessions.filter((s) => s.session_date === nextSession.session_date)
    : [];
  const startsAtHalfPast = daySessions[0]?.start_time.startsWith("09:30") ?? false;
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
  // Première journée : aucun devoir, une carte d'information pratique à la place
  const isFirstDay = nextSession?.session_date === FIRST_DAY;
  const todo = isFirstDay ? [] : dayAssignments.filter((a) => !doneIds.has(a.id));
  // L'accueil ne montre que les deux premiers travaux ; « Voir tout » ouvre la liste complète
  const toPrepare = todo.slice(0, 2);
  const todoCount = toPrepare.length;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[1fr_360px]">
      <section className="rounded-lg border border-border bg-background px-5 py-4 sm:px-6 sm:py-5">
        {nextSession ? (
          <>
            <div className="flex items-start justify-between gap-4 border-b border-border-soft pb-4">
              <div className="min-w-0">
                <p className="label text-[11px] tracking-[0.14em] text-muted">
                  Prochaine journée
                </p>
                <h2 className="font-title mt-1.5 text-[20px] leading-tight text-foreground sm:text-[22px]">
                  {formatSessionDate(nextSession.session_date)}
                  <span className="mx-2 font-sans text-base font-normal text-muted">·</span>
                  <span className="font-sans text-[15px] font-semibold sm:text-base">
                    {formatTimeRange(
                      daySessions[0].start_time,
                      daySessions[daySessions.length - 1].end_time
                    )}
                  </span>
                </h2>
                <p className="mt-1 text-[13px] text-muted">
                  {nextSession.location}
                  {nextSession.room ? ` · ${nextSession.room}` : ""}
                </p>
              </div>
              <span className="label shrink-0 pt-0.5 text-[10px] tracking-[0.08em] text-muted">
                J-{daysLeft}
              </span>
            </div>

            <ol className="divide-y divide-border-soft">
              {startsAtHalfPast && (
                <li className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-3 py-3 sm:grid-cols-[112px_minmax(0,1fr)]">
                  <p className="text-[12px] font-semibold tabular-nums text-muted sm:text-[13px]">
                    09:10 – 09:30
                  </p>
                  <p className="text-sm font-semibold text-foreground">Accueil</p>
                </li>
              )}
              {daySessions.map((s) => (
                <li
                  key={s.id}
                  className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 py-3 sm:grid-cols-[112px_minmax(0,1fr)]"
                >
                  <p className="pt-0.5 text-[12px] font-semibold tabular-nums text-muted sm:text-[13px]">
                    {formatTimeRange(s.start_time, s.end_time)}
                  </p>
                  <div className="min-w-0 border-l-2 pl-3" style={{ borderColor: colorFor(s.session_type, s.track) }}>
                    {s.track ? (
                      <span
                        className="label block text-[9px] leading-snug tracking-[0.11em]"
                        style={{ color: colorFor(s.session_type, s.track) }}
                      >
                        {s.track}
                      </span>
                    ) : (
                      <SessionTypeBadge type={s.session_type} />
                    )}
                    <p className="mt-1 text-[14px] font-semibold leading-snug text-foreground sm:text-[15px]">
                      {s.courses?.title ?? s.description ?? "Séance"}
                      {s.teacher && (
                        <span className="font-normal text-muted"> · {s.teacher.full_name}</span>
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="mt-1 flex items-start gap-2 border-l-2 border-[#d8aa42] py-1 pl-3 text-[11px] font-semibold leading-5 text-foreground sm:text-xs">
              <span aria-hidden="true" className="shrink-0">⚠️🅿️</span>
              <span>Les places de parking sont limitées. Pensez à arriver 15 minutes plus tôt.</span>
            </p>

            <Link
              href="/etudiant/calendrier"
              className="mt-4 inline-flex min-h-9 items-center text-sm font-semibold text-foreground transition hover:underline"
            >
              Voir le programme →
            </Link>
          </>
        ) : (
          <p className="text-sm text-muted">Aucune séance à venir pour le moment.</p>
        )}
      </section>

      <div className="space-y-4">
        <section className="rounded-lg border border-border bg-background p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h2 className="font-title text-[19px] text-foreground">Messages</h2>
              {newCount > 0 && (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-m-doctoral px-1.5 text-xs font-semibold text-white">
                  {newCount}
                </span>
              )}
            </div>
            <Bell size={20} strokeWidth={1.6} className="text-muted" aria-hidden="true" />
          </div>

          {preview.length ? (
            <ul className="mt-3 divide-y divide-border-soft border-t border-border-soft">
              {preview.map((m) => (
                <li key={m.id}>
                  <Link href="/etudiant/messages" className="group flex items-start gap-3 py-3">
                    <span
                      className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        m.isNew ? "bg-accent text-on-accent" : "bg-surface text-muted"
                      }`}
                    >
                      <Bell size={18} strokeWidth={1.7} />
                      {m.isNew && (
                        <span
                          aria-label="Nouveau message"
                          className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-background bg-m-doctoral"
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-[15px] leading-snug text-foreground ${
                          m.isNew ? "font-semibold" : "font-medium"
                        }`}
                      >
                        {m.title}
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-sm text-muted">{m.body.replace(/\s+/g, " ")}</span>
                      <span className="mt-1.5 block text-xs text-muted">
                        {m.by ? `${m.by} · ` : "L'équipe Ministry School · "}
                        {shortDate(m.at)}
                      </span>
                    </span>
                    <ChevronRight size={16} className="mt-1 shrink-0 text-muted transition group-hover:text-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 border-t border-border-soft pt-4 text-[15px] text-muted">
              Aucun message pour le moment.
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <Link href="/etudiant/messages" className="text-sm font-medium text-foreground hover:underline">
              Voir tous les messages →
            </Link>
            {newCount > 0 && (
              <form action={markNotificationsSeen}>
                <button type="submit" className="text-[13px] text-muted transition hover:text-foreground">
                  Tout marquer comme lu
                </button>
              </form>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-background p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-title text-[19px] text-foreground">À préparer</h2>
              {nextSession && (
                <p className="mt-1 text-sm text-muted">
                  Avant le {formatSessionDate(nextSession.session_date)}
                </p>
              )}
            </div>
            {!isFirstDay && (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-sm font-semibold text-foreground">
                {todoCount}
              </span>
            )}
          </div>

          {toPrepare.length ? (
            <ul className="mt-3 divide-y divide-border-soft">
              {toPrepare.map((a) => {
                const Icon = /vid[ée]o/i.test(a.kind ?? "") ? Video : FileText;
                return (
                  <li key={a.id}>
                    <Link
                      href="/etudiant/travail"
                      className="group flex items-center gap-3 py-3 text-[15px] text-foreground"
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
          ) : isFirstDay ? (
            <div className="mt-3 text-[15px] leading-relaxed text-foreground">
              <p>Pour profiter pleinement de cette première journée Ministry School, pensez à :</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>apporter de quoi prendre des notes ;</li>
                <li>prévoir une bouteille d&apos;eau ;</li>
              </ul>
            </div>
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
