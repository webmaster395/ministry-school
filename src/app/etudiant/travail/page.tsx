import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getStudentAllSessions,
  getStudentProgramAssignments,
  getStudentCompletedIds,
  getStudentProfile,
  getStudentWorkItems,
  type StudentSession,
} from "@/lib/data/student";
import { formatSessionDate } from "@/lib/format";
import { getMinistry, INK, sessionColor } from "@/lib/ministry";
import TravailTabs from "@/components/TravailTabs";
import { toggleAssignment } from "./actions";

type Tab = "a-faire" | "termines";

type Assignment = Awaited<ReturnType<typeof getStudentProgramAssignments>>[number];

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
  const tab: Tab = onglet === "termines" ? "termines" : "a-faire";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [sessions, { ministrySlug }, doneIds] = await Promise.all([
    getStudentAllSessions(supabase, user!.id),
    getStudentProfile(supabase, user!.id),
    getStudentCompletedIds(supabase, user!.id),
  ]);
  const assignments = await getStudentProgramAssignments(
    supabase,
    sessions.map((s) => s.id),
  );

  const ministryColor = getMinistry(ministrySlug)?.color ?? INK;
  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const isDone = (a: Assignment) => doneIds.has(a.id);
  const work = getStudentWorkItems(assignments, sessions);
  const open = work.filter(({ assignment }) => !isDone(assignment));
  const finished = work.filter(({ assignment }) => isDone(assignment));
  const shown = tab === "a-faire" ? open : finished;

  // Chaque travail est présenté sous la séance pour laquelle il doit être prêt.
  const groups = new Map<string, typeof shown>();
  for (const item of shown) {
    const key = item.targetId ?? `sans-date:${item.origin.id}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const orderedGroups = [...groups.entries()]
    .map(([key, items]) => ({
      session: (key.startsWith("sans-date:")
        ? sessionById.get(key.replace("sans-date:", ""))
        : sessionById.get(key)) as StudentSession,
      items,
    }))
    .filter((g) => g.session)
    .sort(
      (a, b) =>
        a.session.session_date.localeCompare(b.session.session_date) ||
        a.session.start_time.localeCompare(b.session.start_time),
    );

  const tabs: { key: Tab; label: string; count: number; href: string }[] = [
    {
      key: "a-faire",
      label: "À faire",
      count: open.length,
      href: "/etudiant/travail",
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

      {tab === "a-faire" && open.length > 0 && (
        <section className="flex flex-wrap items-end justify-between gap-6 rounded-lg border border-border bg-background p-6">
          <div>
            <p className="text-sm text-muted">Votre préparation</p>
            <h2 className="font-title mt-1 text-[24px] leading-tight text-foreground">
              {open.length} {open.length > 1 ? "travaux" : "travail"} à faire
            </h2>
            <p className="mt-1 text-[15px] text-muted">
              Chaque consigne reste visible jusqu’à ce que vous la cochiez.
            </p>
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

                <span className="text-sm text-muted">Pour le {formatSessionDate(s.session_date).toLowerCase()}</span>
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
                            {after
                              ? `Donné après ${s.courses?.title ?? s.description ?? "le cours précédent"}`
                              : (s.courses?.title ?? s.description ?? "Cours")}
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
              : "Tout est prêt : aucun travail à faire pour le moment."}
          </p>
        </section>
      )}
    </div>
  );
}
