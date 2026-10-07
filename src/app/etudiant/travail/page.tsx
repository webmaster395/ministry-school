import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getStudentAllSessions,
  getStudentAssignments,
  getStudentCompletedIds,
  getStudentProfile,
  getStudentWorkItems,
  type StudentSession,
} from "@/lib/data/student";
import { formatSessionDate } from "@/lib/format";
import { getMinistry, INK, sessionColor } from "@/lib/ministry";
import TravailTabs from "@/components/TravailTabs";
import { toggleAssignment } from "./actions";

type Tab = "prochaine" | "plus-tard" | "termines";

type Assignment = Awaited<ReturnType<typeof getStudentAssignments>>[number];

function dueLabels(after: boolean, date: string | null) {
  const primary = after
    ? "À terminer avant le prochain cours"
    : "À terminer avant le cours concerné";
  if (!date) return [primary];
  const prefix = after ? "Prochain cours" : "Cours";
  return [primary, `${prefix} : ${formatSessionDate(date).toLowerCase()}`];
}

export default async function StudentWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string }>;
}) {
  const { onglet } = await searchParams;
  const tab: Tab =
    onglet === "plus-tard" || onglet === "termines" ? onglet : "prochaine";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [sessions, { ministrySlug }, doneIds] = await Promise.all([
    getStudentAllSessions(supabase, user!.id),
    getStudentProfile(supabase, user!.id),
    getStudentCompletedIds(supabase, user!.id),
  ]);
  const assignments = await getStudentAssignments(
    supabase,
    sessions.map((s) => s.id),
  );

  const ministryColor = getMinistry(ministrySlug)?.color ?? INK;
  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const isDone = (a: Assignment) => doneIds.has(a.id);
  const work = getStudentWorkItems(assignments, sessions);
  const open = work.filter(({ assignment }) => !isDone(assignment));
  const knownDates = open
    .map((item) => item.targetDate)
    .filter((date): date is string => !!date)
    .sort();
  const nextDate = knownDates[0] ?? null;
  const nextDayTodo = open.filter(
    (item) => item.targetDate === nextDate || item.targetDate === null,
  );
  const later = open.filter(
    (item) => item.targetDate !== null && item.targetDate !== nextDate,
  );
  const finished = work.filter(({ assignment }) => isDone(assignment));
  const shown =
    tab === "prochaine" ? nextDayTodo : tab === "plus-tard" ? later : finished;

  // Regroupement par séance, dans l'ordre chronologique
  const groups = new Map<string, typeof shown>();
  for (const item of shown)
    groups.set(item.origin.id, [...(groups.get(item.origin.id) ?? []), item]);
  const orderedGroups = [...groups.entries()]
    .map(([id, items]) => ({
      session: sessionById.get(id) as StudentSession,
      items,
    }))
    .filter((g) => g.session)
    .sort(
      (a, b) =>
        a.session.session_date.localeCompare(b.session.session_date) ||
        a.session.start_time.localeCompare(b.session.start_time),
    );

  const nextItems = work.filter((item) => item.targetDate === nextDate);
  const doneOnNextDay = nextItems.filter(({ assignment }) =>
    isDone(assignment),
  ).length;
  const percent = nextItems.length
    ? (doneOnNextDay / nextItems.length) * 100
    : 0;
  const nextSession = nextDate
    ? sessions.find((s) => s.session_date === nextDate)
    : null;

  const tabs: { key: Tab; label: string; count: number; href: string }[] = [
    {
      key: "prochaine",
      label: "Prochaine session",
      count: nextDayTodo.length,
      href: "/etudiant/travail",
    },
    {
      key: "plus-tard",
      label: "Plus tard",
      count: later.length,
      href: "/etudiant/travail?onglet=plus-tard",
    },
    {
      key: "termines",
      label: "Terminés",
      count: finished.length,
      href: "/etudiant/travail?onglet=termines",
    },
  ];

  return (
    <div className="space-y-5">
      <p className="text-[15px] text-muted">
        Retrouvez tout ce que vous devez préparer pour vos cours.
      </p>

      <TravailTabs tabs={tabs} active={tab} />

      {tab === "prochaine" && nextSession && (
        <section className="flex flex-wrap items-end justify-between gap-6 rounded-lg border border-border bg-background p-6">
          <div>
            <p className="text-sm text-muted">Prochaine journée</p>
            <h2 className="font-title mt-1 text-[24px] leading-tight text-foreground">
              {formatSessionDate(nextSession.session_date)}
            </h2>
            <p className="mt-1 text-[15px] text-muted">
              {nextSession.location} · {nextDayTodo.length} élément
              {nextDayTodo.length > 1 ? "s" : ""} à préparer
            </p>
          </div>
          <div className="w-full max-w-[240px]">
            <p className="text-sm font-semibold text-foreground">
              {doneOnNextDay} sur {nextItems.length} terminé
              {doneOnNextDay > 1 ? "s" : ""}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </section>
      )}

      {orderedGroups.length ? (
        orderedGroups.map(({ session: s, items }) => {
          const color = sessionColor(s.track, s.session_type, ministryColor);
          const detailHref = `/etudiant/seances/${s.id}`;
          return (
            <section
              key={s.id}
              className="rounded-lg border border-border bg-background p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-soft pb-4">
                <Link
                  href={detailHref}
                  className="group flex flex-wrap items-center gap-3 transition hover:opacity-80"
                >
                  {s.track && (
                    <span
                      className="label rounded-full px-3 py-1 text-[11px] tracking-[0.1em] text-foreground"
                      style={{
                        background: `color-mix(in srgb, ${color} 28%, transparent)`,
                      }}
                    >
                      {s.track}
                    </span>
                  )}
                  <h3 className="font-title text-[20px] text-foreground group-hover:underline">
                    {s.courses?.title ?? s.description ?? "Séance"}
                  </h3>
                  <ChevronRight
                    size={18}
                    className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                  />
                </Link>

                {tab !== "prochaine" && (
                  <span className="text-sm text-muted">
                    {formatSessionDate(s.session_date)}
                  </span>
                )}
              </div>

              <ul className="divide-y divide-border-soft">
                {items.map(({ assignment: a, targetDate, after }) => {
                  const done = isDone(a);
                  const meta = [
                    a.kind,
                    a.duration_min ? `${a.duration_min} min` : null,
                    ...dueLabels(after, targetDate),
                  ].filter(Boolean);
                  return (
                    <li key={a.id}>
                      <form
                        action={toggleAssignment}
                        className="flex items-center gap-4 py-4"
                      >
                        <input
                          type="hidden"
                          name="assignment_id"
                          value={a.id}
                        />
                        <input
                          type="hidden"
                          name="done"
                          value={done ? "1" : "0"}
                        />
                        <button
                          type="submit"
                          aria-label={
                            done
                              ? "Marquer comme à faire"
                              : "Marquer comme fait"
                          }
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${
                            done
                              ? "border-foreground bg-accent text-on-accent"
                              : "border-border hover:border-foreground"
                          }`}
                        >
                          {done && <Check size={15} strokeWidth={2.4} />}
                        </button>
                        <div className="min-w-0">
                          <Link
                            href={`${detailHref}#${after ? "after-course" : "before-course"}`}
                            className={`text-[16px] font-semibold hover:underline ${
                              done
                                ? "text-muted line-through"
                                : "text-foreground"
                            }`}
                          >
                          {a.title || a.instructions}
                          </Link>
                          <p className="mt-0.5 text-sm text-muted">
                            {s.courses?.title ?? s.description ?? "Cours"}
                            {s.track ? ` · ${s.track}` : ""}
                          </p>
                          {meta.length > 0 && (
                            <p className="mt-0.5 text-sm text-muted">
                              {meta.join(" · ")}
                            </p>
                          )}
                        </div>
                        <span
                          className={`ml-auto shrink-0 rounded-full px-3 py-1 text-xs font-medium ${done ? "bg-emerald-50 text-emerald-800" : "bg-surface text-foreground"}`}
                        >
                          {done ? "Terminé" : "À faire"}
                        </span>
                      </form>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      ) : (
        <section className="rounded-lg border border-border bg-background p-6">
          <p className="text-[15px] text-muted">
            {tab === "termines"
              ? "Aucun travail terminé pour le moment."
              : tab === "plus-tard"
                ? "Rien de prévu pour les prochaines sessions."
                : "Rien à préparer pour la prochaine session."}
          </p>
        </section>
      )}
    </div>
  );
}
