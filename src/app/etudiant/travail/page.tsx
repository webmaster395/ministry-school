import Link from "next/link";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getStudentAllSessions,
  getStudentAssignments,
  getStudentCompletedIds,
  getStudentProfile,
  type StudentSession,
} from "@/lib/data/student";
import { formatSessionDate } from "@/lib/format";
import { getMinistry, INK, sessionColor } from "@/lib/ministry";
import { toggleAssignment } from "./actions";

type Tab = "prochaine" | "plus-tard" | "termines";

type Assignment = Awaited<ReturnType<typeof getStudentAssignments>>[number];

function dueLabel(due: string | null) {
  if (!due) return null;
  const d = new Date(due);
  const day = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `Échéance ${day}, ${time}`;
}

export default async function StudentWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string }>;
}) {
  const { onglet } = await searchParams;
  const tab: Tab = onglet === "plus-tard" || onglet === "termines" ? onglet : "prochaine";

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
    sessions.map((s) => s.id)
  );

  const today = new Date().toISOString().slice(0, 10);
  const nextDate = sessions.find((s) => s.session_date >= today)?.session_date ?? null;
  const ministryColor = getMinistry(ministrySlug)?.color ?? INK;
  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  const dateOf = (a: Assignment) => sessionById.get(a.session_id)?.session_date ?? "";
  const isDone = (a: Assignment) => doneIds.has(a.id);

  const nextDay = nextDate ? assignments.filter((a) => dateOf(a) === nextDate) : [];
  const nextDayTodo = nextDay.filter((a) => !isDone(a));
  const later = nextDate ? assignments.filter((a) => dateOf(a) > nextDate && !isDone(a)) : [];
  const finished = assignments.filter(isDone);

  const shown = tab === "prochaine" ? nextDayTodo : tab === "plus-tard" ? later : finished;

  // Regroupement par séance, dans l'ordre chronologique
  const groups = new Map<string, Assignment[]>();
  for (const a of shown) groups.set(a.session_id, [...(groups.get(a.session_id) ?? []), a]);
  const orderedGroups = [...groups.entries()]
    .map(([id, items]) => ({ session: sessionById.get(id) as StudentSession, items }))
    .filter((g) => g.session)
    .sort(
      (a, b) =>
        a.session.session_date.localeCompare(b.session.session_date) ||
        a.session.start_time.localeCompare(b.session.start_time)
    );

  const doneOnNextDay = nextDay.filter(isDone).length;
  const percent = nextDay.length ? (doneOnNextDay / nextDay.length) * 100 : 0;
  const nextSession = nextDate ? sessions.find((s) => s.session_date === nextDate) : null;

  const tabs: { key: Tab; label: string; count: number; href: string }[] = [
    { key: "prochaine", label: "Prochaine session", count: nextDayTodo.length, href: "/etudiant/travail" },
    { key: "plus-tard", label: "Plus tard", count: later.length, href: "/etudiant/travail?onglet=plus-tard" },
    { key: "termines", label: "Terminés", count: finished.length, href: "/etudiant/travail?onglet=termines" },
  ];

  return (
    <div className="space-y-5">
      <p className="text-[15px] text-muted">
        Retrouvez tout ce que vous devez préparer pour vos cours.
      </p>

      <nav className="inline-flex gap-1 rounded-full border border-border bg-background p-1">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
              tab === t.key
                ? "bg-accent font-medium text-on-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
            <span
              className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] ${
                tab === t.key ? "bg-white/20" : "bg-surface"
              }`}
            >
              {t.count}
            </span>
          </Link>
        ))}
      </nav>

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
              {doneOnNextDay} sur {nextDay.length} terminé{doneOnNextDay > 1 ? "s" : ""}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
              <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
            </div>
          </div>
        </section>
      )}

      {orderedGroups.length ? (
        orderedGroups.map(({ session: s, items }) => {
          const color = sessionColor(s.track, s.session_type, ministryColor);
          return (
            <section key={s.id} className="rounded-lg border border-border bg-background p-6">
              <div className="flex flex-wrap items-center gap-3 border-b border-border-soft pb-4">
                {s.track && (
                  <span
                    className="label rounded-full px-3 py-1 text-[11px] tracking-[0.1em] text-foreground"
                    style={{ background: `color-mix(in srgb, ${color} 28%, transparent)` }}
                  >
                    {s.track}
                  </span>
                )}
                <h3 className="font-title text-[20px] text-foreground">
                  {s.courses?.title ?? s.description ?? "Séance"}
                </h3>
                {tab !== "prochaine" && (
                  <span className="text-sm text-muted">{formatSessionDate(s.session_date)}</span>
                )}
              </div>

              <ul className="divide-y divide-border-soft">
                {items.map((a) => {
                  const done = isDone(a);
                  const meta = [
                    a.kind,
                    a.duration_min ? `${a.duration_min} min` : null,
                    dueLabel(a.due_at),
                  ].filter(Boolean);
                  return (
                    <li key={a.id}>
                      <form action={toggleAssignment} className="flex items-center gap-4 py-4">
                        <input type="hidden" name="assignment_id" value={a.id} />
                        <input type="hidden" name="done" value={done ? "1" : "0"} />
                        <button
                          type="submit"
                          aria-label={done ? "Marquer comme à faire" : "Marquer comme fait"}
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${
                            done
                              ? "border-foreground bg-accent text-on-accent"
                              : "border-border hover:border-foreground"
                          }`}
                        >
                          {done && <Check size={15} strokeWidth={2.4} />}
                        </button>
                        <div className="min-w-0">
                          <p
                            className={`text-[16px] font-semibold ${
                              done ? "text-muted line-through" : "text-foreground"
                            }`}
                          >
                            {a.instructions}
                          </p>
                          {meta.length > 0 && (
                            <p className="mt-0.5 text-sm text-muted">{meta.join(" · ")}</p>
                          )}
                        </div>
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
