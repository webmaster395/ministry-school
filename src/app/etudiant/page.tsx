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

  const today = new Date().toISOString().slice(0, 10);
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
      <section className="rounded-lg border border-border bg-background p-5 sm:p-7">
        {nextSession ? (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted">Prochaine journée</p>
                <h2 className="font-title mt-1 text-[21px] leading-tight text-foreground sm:text-[23px]">
                  Votre prochaine journée de formation
                </h2>
              </div>
              <span className="label shrink-0 rounded-full bg-surface px-3.5 py-2 text-xs tracking-[0.08em] text-foreground">
                J-{daysLeft}
              </span>
            </div>

            <p className="mt-3 text-[15px] font-semibold text-foreground">
              {formatSessionDate(nextSession.session_date)}
              <span className="mx-2 text-muted">·</span>
              {formatTimeRange(
                daySessions[0].start_time,
                daySessions[daySessions.length - 1].end_time
              )}
            </p>
            <p className="mt-0.5 text-[13px] text-muted">
              {nextSession.location}
              {nextSession.room ? ` · ${nextSession.room}` : ""}
            </p>

            <ol className="mt-5">
              {startsAtHalfPast && (
                <>
                  <li className="grid grid-cols-[22px_1fr] gap-x-3 lg:grid-cols-[150px_22px_1fr] lg:gap-x-4">
                    <p className="col-start-2 row-start-1 text-[14px] font-semibold text-foreground lg:col-start-1 lg:pt-1">
                      09:10 – 09:30
                    </p>
                    <div className="col-start-1 row-span-2 row-start-1 flex flex-col items-center lg:col-start-2 lg:row-span-1">
                      <span className="mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-[3px] border-background bg-foreground" style={{ boxShadow: "0 0 0 2px var(--foreground)" }} />
                      <span className="w-px flex-1 bg-border" />
                    </div>
                    <div className="col-start-2 row-start-2 pb-4 pt-1 lg:col-start-3 lg:row-start-1 lg:pb-5 lg:pt-0">
                      <span className="label inline-block rounded-2xl bg-surface px-3 py-1 text-[11px] leading-snug tracking-[0.1em] text-foreground">
                        Accueil
                      </span>
                      <p className="mt-1.5 text-[16px] font-semibold text-foreground">Accueil des étudiants</p>
                      <p className="mt-2 rounded-lg border border-border bg-surface px-3 py-2 text-[13.5px] leading-snug text-foreground">
                        <strong className="font-semibold">Attention :</strong> les places de parking sont très limitées.
                        Nous vous recommandons d&apos;arriver en avance.
                      </p>
                    </div>
                  </li>
                  <li className="grid grid-cols-[22px_1fr] gap-x-3 lg:grid-cols-[150px_22px_1fr] lg:gap-x-4">
                    <p className="col-start-2 row-start-1 text-[14px] font-semibold text-foreground lg:col-start-1 lg:pt-1">09:30</p>
                    <div className="col-start-1 row-span-2 row-start-1 flex flex-col items-center lg:col-start-2 lg:row-span-1">
                      <span className="mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-[3px] border-background bg-foreground" style={{ boxShadow: "0 0 0 2px var(--foreground)" }} />
                      <span className="w-px flex-1 bg-border" />
                    </div>
                    <div className="col-start-2 row-start-2 pb-4 pt-1 lg:col-start-3 lg:row-start-1 lg:pb-5 lg:pt-0">
                      <p className="text-[16px] font-semibold text-foreground">Début de la formation</p>
                    </div>
                  </li>
                </>
              )}
              {daySessions.map((s, i) => (
                // L'horaire passe au-dessus du titre tant que la place manque. Le seuil est
                // « lg » et non « sm » : entre les deux, la barre latérale réduit déjà le contenu.
                <li
                  key={s.id}
                  className="grid grid-cols-[22px_1fr] gap-x-3 lg:grid-cols-[150px_22px_1fr] lg:gap-x-4"
                >
                  <p className="col-start-2 row-start-1 text-[14px] font-semibold text-foreground lg:col-start-1 lg:pt-1">
                    {formatTimeRange(s.start_time, s.end_time)}
                  </p>
                  <div className="col-start-1 row-span-2 row-start-1 flex flex-col items-center lg:col-start-2 lg:row-span-1">
                    <span
                      className="mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-[3px] border-background"
                      style={{
                        background: colorFor(s.session_type, s.track),
                        boxShadow: `0 0 0 2px ${colorFor(s.session_type, s.track)}`,
                      }}
                    />
                    {i < daySessions.length - 1 && <span className="w-px flex-1 bg-border" />}
                  </div>
                  <div className="col-start-2 row-start-2 pb-4 pt-1 lg:col-start-3 lg:row-start-1 lg:pb-5 lg:pt-0">
                    {s.track ? (
                      <span
                        className="label inline-block rounded-2xl px-3 py-1 text-[11px] leading-snug tracking-[0.1em] text-foreground"
                        style={{
                          background: `color-mix(in srgb, ${colorFor(s.session_type, s.track)} 28%, transparent)`,
                        }}
                      >
                        {s.track}
                      </span>
                    ) : (
                      <SessionTypeBadge type={s.session_type} />
                    )}
                    <p className="mt-1.5 text-[16px] font-semibold text-foreground">
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
              className="label mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 py-3 text-center text-[11px] tracking-[0.08em] text-on-accent hover:bg-[#1b2221] sm:inline-flex sm:w-auto sm:px-6 sm:text-xs sm:tracking-[0.12em]"
            >
              Voir le programme de la journée →
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
                      <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{m.body}</span>
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
            <p className="mt-4 text-[15px] leading-relaxed text-foreground">
              Pensez à apporter de quoi prendre des notes et une bouteille d&apos;eau, et arrivez en avance : les places de
              parking sont très limitées.
            </p>
          ) : (
            <p className="mt-4 text-sm text-muted">Rien à préparer pour cette journée.</p>
          )}
          <Link
            href="/etudiant/travail"
            className="mt-3 inline-block text-sm font-medium text-foreground hover:underline"
          >
            {isFirstDay ? "Voir les informations pratiques →" : "Voir tout →"}
          </Link>
        </section>
      </div>
    </div>
  );
}
