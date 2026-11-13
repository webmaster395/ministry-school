import Link from "next/link";
import { BookOpen, ChevronRight, FileText, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getStudentProgramAssignments,
  getStudentCompletedIds,
  getStudentProgram,
  getStudentWorkItems,
} from "@/lib/data/student";
import { formatSessionDate, formatTimeRange } from "@/lib/format";
import SessionTypeBadge from "@/components/SessionTypeBadge";
import { getMinistry, INK, sessionColor } from "@/lib/ministry";
import { getViewer } from "@/lib/data/viewer";

export default async function StudentDashboardPage() {
  const viewer = await getViewer();
  const supabase = await createClient();
  const allSessions = await getStudentProgram(
    viewer!.ministryId,
    viewer!.preferredDay,
  );

  // Date du jour à Paris (et non en UTC), pour que le décompte change bien à minuit heure de Paris
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
  const nextSession = allSessions.find((s) => s.session_date >= today);

  const ministryColor = getMinistry(viewer!.ministrySlug)?.color ?? INK;
  const colorFor = (type: "commun" | "ministere", track?: string | null) =>
    sessionColor(track, type, ministryColor);

  // Toutes les séances de la prochaine journée, dans l'ordre horaire
  const daySessions = nextSession
    ? allSessions.filter((s) => s.session_date === nextSession.session_date)
    : [];
  const showWelcomeSlot = daySessions[0]?.start_time.startsWith("09:30") ?? false;
  const showParkingNotice = daySessions.some((session) => session.show_parking_notice);
  const daysLeft = nextSession
    ? Math.max(
        0,
        Math.round(
          (new Date(nextSession.session_date).getTime() - new Date(today).getTime()) / 86400000
        )
      )
    : 0;
  const [assignments, doneIds] = await Promise.all([
    getStudentProgramAssignments(
      supabase,
      allSessions.map((s) => s.id)
    ),
    getStudentCompletedIds(supabase, viewer!.id),
  ]);
  const work = getStudentWorkItems(assignments, allSessions);
  // Les anciens travaux restent visibles jusqu’à leur validation. La date de la
  // prochaine journée ne doit jamais faire disparaître un devoir non terminé.
  const todo = work.filter(({ assignment }) => !doneIds.has(assignment.id));
  const nowIso = new Date().toISOString();
  const [featuredAppsResult, featuredResourcesResult, viewedResult, materialsResult] = await Promise.all([
    supabase.from("app_catalog").select("id,slug,featured_generation").eq("featured", true).in("status", ["scheduled", "published"]).or(`featured_start_at.is.null,featured_start_at.lte.${nowIso}`).or(`featured_end_at.is.null,featured_end_at.gte.${nowIso}`),
    supabase.from("managed_resources").select("id,featured_generation").eq("featured", true).eq("status", "published").or(`featured_start_at.is.null,featured_start_at.lte.${nowIso}`).or(`featured_end_at.is.null,featured_end_at.gte.${nowIso}`),
    supabase.from("featured_content_views").select("content_type,content_id,generation").eq("user_id", viewer!.id),
    supabase.from("opportunity_date_registrations").select("opportunity_date:opportunity_dates!inner(session_date,opportunity:opportunities!inner(id,title,participant_material))").eq("user_id", viewer!.id).gte("opportunity_date.session_date", today),
  ]);
  const seen = new Set((viewedResult.data ?? []).map((item) => `${item.content_type}:${item.content_id}:${item.generation}`));
  const featuredTools = (featuredAppsResult.data ?? []).filter((item) => !seen.has(`tool:${item.id}:${item.featured_generation}`));
  const featuredResources = (featuredResourcesResult.data ?? []).filter((item) => !seen.has(`resource:${item.id}:${item.featured_generation}`));
  const materials = (materialsResult.data ?? []).flatMap((row) => {
    const date = row.opportunity_date as unknown as { session_date: string; opportunity: { id: string; title: string; participant_material: string | null } } | null;
    return date?.opportunity.participant_material ? [{ ...date.opportunity, date: date.session_date }] : [];
  });

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
            {showParkingNotice && (
              <div className="mt-3 inline-flex max-w-full items-center gap-2.5 rounded-full bg-[#1f2927] px-3.5 py-2 text-[12px] leading-snug text-white sm:text-[13px]">
                <span aria-hidden="true" className="shrink-0">⚠️🅿️</span>
                <p className="font-normal text-white/85">
                  <span className="font-semibold text-white">Les places de parking sont très limitées.</span>{" "}
                  Pensez à arriver suffisamment en avance.
                </p>
              </div>
            )}

            <ol className="mt-5">
              {showWelcomeSlot && (
                <li className="grid grid-cols-[22px_1fr] gap-x-3 lg:grid-cols-[150px_22px_1fr] lg:gap-x-4">
                  <p className="col-start-2 row-start-1 text-[14px] font-semibold text-foreground lg:col-start-1 lg:pt-1">
                    09:10 – 09:30
                  </p>
                  <div className="col-start-1 row-span-2 row-start-1 flex flex-col items-center lg:col-start-2 lg:row-span-1">
                    <span
                      className="mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-[3px] border-background bg-foreground"
                      style={{ boxShadow: "0 0 0 2px var(--foreground)" }}
                    />
                    <span className="w-px flex-1 bg-border" />
                  </div>
                  <div className="col-start-2 row-start-2 pb-7 pt-2 lg:col-start-3 lg:row-start-1 lg:pb-7 lg:pt-0">
                    <span className="label inline-block rounded-full bg-surface px-3 py-1 text-[11px] tracking-[0.1em] text-foreground">
                      Accueil
                    </span>
                  </div>
                </li>
              )}
              {daySessions.map((s, i) => (
                <li key={s.id}>
                  <Link
                    href={`/etudiant/seances/${s.id}`}
                    aria-label={`Ouvrir le cours ${s.courses?.title ?? s.description ?? "Séance"}`}
                    className="group grid grid-cols-[22px_1fr] gap-x-3 rounded-md transition hover:bg-surface/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground lg:grid-cols-[150px_22px_1fr] lg:gap-x-4"
                  >
                    <p className="col-start-2 row-start-1 text-[14px] font-semibold text-foreground lg:col-start-1 lg:pt-1">
                      {formatTimeRange(s.start_time, s.end_time)}
                    </p>
                    <div className="col-start-1 row-span-2 row-start-1 flex flex-col items-center lg:col-start-2 lg:row-span-1">
                      <span
                        className="mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-[3px] border-background transition group-hover:scale-110"
                        style={{
                          background: colorFor(s.session_type, s.track),
                          boxShadow: `0 0 0 2px ${colorFor(s.session_type, s.track)}`,
                        }}
                      />
                      {i < daySessions.length - 1 && <span className="w-px flex-1 bg-border" />}
                    </div>
                    <div className="col-start-2 row-start-2 pb-8 pt-2 lg:col-start-3 lg:row-start-1 lg:pb-8 lg:pt-0">
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
                    <p className="mt-3 text-[16px] font-semibold leading-snug text-foreground transition group-hover:text-link">
                      {s.courses?.title ?? s.description ?? "Séance"}
                    </p>
                    {s.trainers?.length ? (
                      <div className="mt-3 flex items-center gap-3 text-sm text-muted">
                        <span className="flex shrink-0 -space-x-2" aria-hidden="true">
                          {s.trainers.map((trainer) => (
                            <span
                              key={trainer.id}
                              className="grid h-8 w-8 place-items-center overflow-hidden rounded-full border-2 border-background bg-surface text-[10px] font-semibold text-foreground"
                            >
                              {trainer.photoUrl ? (
                                <img
                                  src={trainer.photoUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                trainer.name
                                  .split(/\s+/)
                                  .map((part) => part[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase()
                              )}
                            </span>
                          ))}
                        </span>
                        <span>{s.trainers.map((trainer) => trainer.name).join(" · ")}</span>
                      </div>
                    ) : s.teacher ? (
                      <p className="mt-3 text-sm text-muted">Avec {s.teacher.full_name}</p>
                    ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ol>

            <Link
              href="/etudiant/calendrier"
              className="label mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 py-3 text-center text-[11px] tracking-[0.08em] text-on-accent hover:bg-[#1b2221] sm:inline-flex sm:w-auto sm:px-6 sm:text-xs sm:tracking-[0.12em]"
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
          <h2 className="font-title text-[19px] text-foreground">À ne pas manquer</h2>
          <div className="mt-3 divide-y divide-border-soft">
            {todo.length > 0 && <DashboardLine href="/etudiant/travail" icon={<FileText size={17} />} title="Travail à faire" detail="Les travaux non terminés restent ici, même après leur mois d’origine." count={todo.length} alert />}
            {featuredResources.length > 0 && <DashboardLine href="/etudiant/ressources?selection=alaune" icon={<BookOpen size={17} />} title="Nouvelles ressources" detail="Sélectionnées pour toi" count={featuredResources.length} />}
            {featuredTools.length > 0 && <DashboardLine href={`/etudiant/outils/${featuredTools[0].slug}/ouvrir`} icon={<Wrench size={17} />} title="Outils à découvrir" detail={featuredTools.length === 1 ? "Sélectionné pour toi" : "Ouvre la première sélection, puis retrouve les autres ici."} count={featuredTools.length} />}
            {materials.slice(0, 2).map((material) => <DashboardLine key={`${material.id}-${material.date}`} href={`/etudiant/services/${material.id}`} icon={<Wrench size={17} />} title="Matériel à prévoir" detail={`${material.title} · ${formatSessionDate(material.date)}`} />)}
            {!todo.length && !featuredResources.length && !featuredTools.length && !materials.length && <p className="py-4 text-sm text-muted">Tout est à jour.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

function DashboardLine({ href, icon, title, detail, count, alert = false }: { href: string; icon: React.ReactNode; title: string; detail: string; count?: number; alert?: boolean }) {
  return <Link href={href} className="group flex items-center gap-3 py-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-surface text-muted">{icon}</span><span className="min-w-0 flex-1"><strong className="block text-sm group-hover:underline">{title}</strong><span className="block truncate text-xs text-muted">{detail}</span></span>{typeof count === "number" && <span className={`grid h-7 min-w-7 place-items-center rounded-full px-2 text-xs font-bold ${alert ? "bg-[#b42318] text-white" : "bg-surface text-foreground"}`}>{count}</span>}<ChevronRight size={16} className="text-muted" /></Link>;
}
