import Link from "next/link";
import { CalendarDays, CheckCircle2, ChevronRight, CircleUser, MapPin } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getStudentAllSessions,
  getStudentAssignments,
  getStudentCompletedIds,
  studentSessionTrainerNames,
  type StudentSession,
} from "@/lib/data/student";
import { getViewer } from "@/lib/data/viewer";
import { PROMOTION } from "@/lib/promotion";

type Period = "upcoming" | "past";
type CourseKind = "all" | "coeur" | "caractere" | "sensibilite" | "projet";

const COURSE_KINDS: Array<{ key: CourseKind; label: string }> = [
  { key: "all", label: "Tous" },
  { key: "coeur", label: "Formation du cœur" },
  { key: "caractere", label: "Caractère" },
  { key: "sensibilite", label: "Sensibilité ministérielle" },
  { key: "projet", label: "Projet et formation" },
];

const KIND_STYLES: Record<Exclude<CourseKind, "all">, { color: string; label: string }> = {
  coeur: { color: "var(--f-coeur)", label: "Formation du cœur" },
  caractere: { color: "var(--f-caractere)", label: "Caractère" },
  sensibilite: { color: "var(--f-sensibilite)", label: "Sensibilité ministérielle" },
  projet: { color: "var(--f-projet)", label: "Projet et formation" },
};

function kindOf(session: StudentSession): Exclude<CourseKind, "all"> {
  const value = `${session.track ?? ""} ${session.description ?? ""}`.toLowerCase();
  if (value.includes("cœur") || value.includes("coeur")) return "coeur";
  if (value.includes("caractère") || value.includes("caractere")) return "caractere";
  if (value.includes("sensibilité") || value.includes("sensibilite") || session.session_type === "ministere") {
    return "sensibilite";
  }
  return "projet";
}

function parisDate() {
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function dateParts(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return {
    day: new Intl.DateTimeFormat("fr-FR", { day: "2-digit" }).format(date),
    month: new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(date).replace(".", "").toUpperCase(),
    long: new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date),
  };
}

function hours(start: string, end: string) {
  const short = (value: string) => value.slice(0, 5).replace(":", " h ").replace(/ h 00$/, " h");
  return `${short(start)} – ${short(end)}`;
}

function courseHref(period: Period, kind: CourseKind) {
  const query = new URLSearchParams();
  if (period === "past") query.set("periode", "passes");
  if (kind !== "all") query.set("type", kind);
  const value = query.toString();
  return `/etudiant/cours${value ? `?${value}` : ""}`;
}

export default async function StudentCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; type?: string }>;
}) {
  const params = await searchParams;
  const period: Period = params.periode === "passes" ? "past" : "upcoming";
  const requestedKind = COURSE_KINDS.some((item) => item.key === params.type)
    ? (params.type as CourseKind)
    : "all";

  const supabase = await createClient();
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const sessions = await getStudentAllSessions(supabase, viewer.id);
  const [assignments, completedIds] = await Promise.all([
    getStudentAssignments(supabase, sessions.map((session) => session.id)),
    getStudentCompletedIds(supabase, viewer.id),
  ]);

  const today = parisDate();
  const inPeriod = sessions.filter((session) =>
    period === "past" ? session.session_date < today : session.session_date >= today,
  );
  const visible = inPeriod
    .filter((session) => requestedKind === "all" || kindOf(session) === requestedKind)
    .sort((a, b) => {
      const order = a.session_date.localeCompare(b.session_date) || a.start_time.localeCompare(b.start_time);
      return period === "past" ? -order : order;
    });

  const assignmentBySession = new Map<string, typeof assignments>();
  for (const assignment of assignments) {
    const current = assignmentBySession.get(assignment.session_id) ?? [];
    current.push(assignment);
    assignmentBySession.set(assignment.session_id, current);
  }

  const upcomingCount = sessions.filter((session) => session.session_date >= today).length;
  const pastCount = sessions.filter((session) => session.session_date < today).length;

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-muted">Promotion {PROMOTION}</p>
          <h1 className="mt-0.5 font-title text-[25px] leading-tight text-foreground sm:text-[29px]">Mes cours</h1>
          <p className="mt-1 text-[14px] text-muted">Ton programme, les informations utiles et le travail à préparer.</p>
        </div>
        <Link
          href="/etudiant/travail"
          className="inline-flex min-h-10 items-center rounded-full border border-border bg-background px-4 text-[14px] font-semibold text-foreground transition hover:border-foreground"
        >
          Voir tout le travail à faire
        </Link>
      </header>

      <div className="sticky top-0 z-10 -mx-4 space-y-3 border-y border-border-soft bg-[color:var(--background)]/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        <nav aria-label="Période" className="inline-flex rounded-full bg-surface p-1">
          <Link
            href={courseHref("upcoming", requestedKind)}
            className={`rounded-full px-4 py-2 text-[14px] font-semibold transition ${period === "upcoming" ? "bg-accent text-on-accent shadow-sm" : "text-muted hover:text-foreground"}`}
          >
            À venir <span className="ml-1 opacity-70">{upcomingCount}</span>
          </Link>
          <Link
            href={courseHref("past", requestedKind)}
            className={`rounded-full px-4 py-2 text-[14px] font-semibold transition ${period === "past" ? "bg-accent text-on-accent shadow-sm" : "text-muted hover:text-foreground"}`}
          >
            Passés <span className="ml-1 opacity-70">{pastCount}</span>
          </Link>
        </nav>

        <nav aria-label="Type de cours" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:px-0">
          {COURSE_KINDS.map((item) => (
            <Link
              key={item.key}
              href={courseHref(period, item.key)}
              className={`inline-flex min-h-9 shrink-0 items-center rounded-full border px-3.5 text-[13px] font-medium transition ${requestedKind === item.key ? "border-foreground bg-foreground text-background" : "border-border bg-background text-muted hover:border-foreground/40 hover:text-foreground"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {visible.length ? (
        <ul className="overflow-hidden rounded-2xl border border-border bg-background shadow-[0_16px_50px_rgba(39,48,47,0.04)]">
          {visible.map((session) => {
            const kind = kindOf(session);
            const style = KIND_STYLES[kind];
            const date = dateParts(session.session_date);
            const trainer = studentSessionTrainerNames(session);
            const work = assignmentBySession.get(session.id) ?? [];
            const completed = work.filter((assignment) => completedIds.has(assignment.id)).length;
            const remaining = work.length - completed;
            const title = session.courses?.title ?? session.description ?? "Cours";

            return (
              <li key={session.id} className="border-b border-border-soft last:border-b-0">
                <Link
                  href={`/etudiant/seances/${session.id}`}
                  className="group relative grid gap-3 px-4 py-4 transition hover:bg-surface/60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] sm:grid-cols-[74px_minmax(0,1fr)_auto] sm:items-center sm:gap-5 sm:px-5 sm:py-5"
                  style={{ outlineColor: style.color }}
                >
                  <span aria-hidden="true" className="absolute inset-y-3 left-0 w-[3px] rounded-r-full" style={{ backgroundColor: style.color }} />

                  <div className="flex items-center gap-3 sm:block sm:text-center">
                    <span className="text-[25px] font-semibold leading-none text-foreground sm:block">{date.day}</span>
                    <span className="text-[11px] font-bold tracking-[0.12em] text-muted sm:mt-1 sm:block">{date.month}</span>
                    <span className="text-[12px] text-muted sm:mt-1 sm:block">{session.start_time.slice(0, 5)}</span>
                  </div>

                  <div className="min-w-0">
                    <span
                      className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{ color: style.color, backgroundColor: `color-mix(in srgb, ${style.color} 13%, transparent)` }}
                    >
                      {style.label}
                    </span>
                    <h2 className="mt-2 text-[16px] font-semibold leading-snug text-foreground sm:text-[17px]">{title}</h2>
                    <p className="mt-1 text-[13px] capitalize text-muted sm:hidden">{date.long}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
                      <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} /> {hours(session.start_time, session.end_time)}</span>
                      <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {session.location || "Espace Martin Luther King"}{session.room ? ` · ${session.room}` : ""}</span>
                      {trainer && <span className="inline-flex items-center gap-1.5"><CircleUser size={14} /> {trainer}</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 border-t border-border-soft pt-3 sm:min-w-[155px] sm:justify-end sm:border-0 sm:pt-0">
                    <div className="text-left sm:text-right">
                      {work.length === 0 ? (
                        <span className="text-[12px] text-muted">Aucun travail</span>
                      ) : remaining === 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-700"><CheckCircle2 size={15} /> Tout est terminé</span>
                      ) : (
                        <>
                          <span className="block text-[12px] font-semibold text-foreground">{remaining} élément{remaining > 1 ? "s" : ""} à préparer</span>
                          {completed > 0 && <span className="mt-0.5 block text-[11px] text-muted">{completed} terminé{completed > 1 ? "s" : ""}</span>}
                        </>
                      )}
                    </div>
                    <ChevronRight size={19} className="shrink-0 text-muted transition group-hover:translate-x-1 group-hover:text-foreground" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <section className="rounded-2xl border border-dashed border-border bg-background px-6 py-12 text-center">
          <p className="text-[15px] font-medium text-foreground">Aucun cours {period === "past" ? "passé" : "à venir"} dans cette catégorie.</p>
          <Link href={courseHref(period, "all")} className="mt-3 inline-flex text-[14px] font-semibold text-foreground underline underline-offset-4">Afficher tous les cours</Link>
        </section>
      )}
    </div>
  );
}
