import Link from "next/link";
import { CalendarDays, Check, ChevronRight, MapPin, Minus, Users } from "lucide-react";
import MinistryPicto from "@/components/MinistryPicto";
import AddCourseDialog from "@/components/gestion/AddCourseDialog";
import { DRAFTS_ENABLED } from "@/lib/drafts";
import { formatSessionDate, formatTimeRange, formatTimeRangeFr } from "@/lib/format";
import { progressOf, type ChecklistItem, type PilotSession } from "@/lib/data/pilotage";
import { sessionColor } from "@/lib/ministry";

export type PrepRow = {
  s: PilotSession;
  items: ChecklistItem[];
  progress: ReturnType<typeof progressOf>;
  /** Étudiants attendus (nombre seulement, jamais de noms) */
  students: number | null;
};

export type PrepTab = "prochain" | "avenir" | "passes";
export type UpcomingFilter = "tous" | "a-completer" | "prets" | "sans-formateur";

const TABS: { key: PrepTab; label: string }[] = [
  { key: "prochain", label: "Prochain cours" },
  { key: "avenir", label: "À venir" },
  { key: "passes", label: "Passés" },
];

const titleOf = (s: PilotSession) => s.description ?? "À définir";
const ATTENTION = "bg-m-doctoral/[0.12] text-link";

/**
 * Tableau de préparation des cours : commun au pilotage ministériel (pasteur et secrétaire)
 * et à l'enseignant. Seule la liste des séances et des éléments change.
 */
export default function PrepBoard({
  tab,
  hrefFor,
  rows,
  ministryColor,
  today,
  labels,
  upcomingFilter,
  ministry,
}: {
  /** Présent dans l'espace Pilotage : le ministère supervisé (présentation propre au pilotage) */
  ministry?: { slug: string; name: string; id?: string };
  /** Libellés des onglets « à venir » et « passés », propres à chaque espace */
  labels?: Partial<Record<PrepTab, string>>;
  /** Si présent, l'onglet « à venir » devient un tableau filtrable de tous les cours (espace enseignant) */
  upcomingFilter?: { current: UpcomingFilter; hrefFor: (f: UpcomingFilter) => string; options?: UpcomingFilter[] };
  tab: PrepTab;
  hrefFor: (t: PrepTab) => string;
  rows: PrepRow[];
  ministryColor: string;
  today: string;
}) {
  const upcoming = rows.filter((r) => r.s.session_date >= today);
  const past = rows.filter((r) => r.s.session_date < today);
  const next = upcoming[0];
  const later = upcoming.slice(1);

  return (
    <div className="space-y-5">
      <nav className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-background p-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={hrefFor(t.key)}
            className={`rounded-md py-3 text-center text-[15px] transition ${
              tab === t.key ? "bg-accent font-medium text-on-accent" : "text-muted hover:text-foreground"
            }`}
          >
            {labels?.[t.key] ?? t.label}
          </Link>
        ))}
      </nav>

      {tab === "prochain" &&
        (next ? (
          <Next row={next} today={today} ministryColor={ministryColor} pilot={!!ministry} />
        ) : (
          <Empty text="Aucun cours à venir." />
        ))}
      {tab === "avenir" &&
        (upcomingFilter ? (
          <UpcomingTable rows={upcoming} filter={upcomingFilter} ministryColor={ministryColor} ministry={ministry} />
        ) : later.length ? (
          <List rows={later} />
        ) : (
          <Empty text="Aucun autre cours à venir." />
        ))}
      {tab === "passes" && (past.length ? <List rows={past} /> : <Empty text="Aucun cours passé pour le moment." />)}
    </div>
  );
}

function Next({ row, today, ministryColor, pilot }: { row: PrepRow; today: string; ministryColor: string; pilot: boolean }) {
  const { s, items, progress, students } = row;
  const color = sessionColor(s.track, "commun", ministryColor);
  const days = Math.round(
    (new Date(s.session_date).getTime() - new Date(today).getTime()) / 86400000
  );
  const teacher = s.teacher?.full_name ?? s.speaker_name;

  return (
    <>
      {pilot && (
        <div>
          <h3 className="font-title text-[24px] text-foreground">Prochain cours du ministère</h3>
          <p className="text-sm text-muted">{formatSessionDate(s.session_date).toLowerCase()} {s.session_date.slice(0, 4)}</p>
        </div>
      )}
      <section
        className="grid gap-6 rounded-lg border border-border border-t-[3px] bg-background p-6 sm:p-7 lg:grid-cols-[1fr_360px] lg:divide-x lg:divide-border-soft"
        style={{ borderTopColor: color }}
      >
        <div>
          {s.track && !pilot && (
            <span
              className="label rounded-full px-3 py-1 text-[11px] tracking-[0.1em] text-foreground"
              style={{ background: `color-mix(in srgb, ${color} 30%, transparent)` }}
            >
              {s.track}
            </span>
          )}
          <h3 className={`font-title text-[26px] leading-tight text-foreground ${pilot ? "" : "mt-5"}`}>{titleOf(s)}</h3>
          <p className="mt-4 flex items-center gap-2 text-[15px] text-muted">
            <CalendarDays size={17} strokeWidth={1.6} />
            {pilot
              ? `${formatSessionDate(s.session_date).toLowerCase()} ${s.session_date.slice(0, 4)} · ${formatTimeRangeFr(s.start_time, s.end_time)}`
              : `${formatSessionDate(s.session_date)} · ${formatTimeRange(s.start_time, s.end_time)}`}
          </p>
          <p className="mt-1.5 flex items-center gap-2 text-[15px] text-muted">
            <MapPin size={17} strokeWidth={1.6} />
            {s.location}
            {s.room ? ` · ${s.room}` : ""}
            {teacher ? ` · ${teacher}` : pilot ? " · Formateur à affecter" : ""}
            {!pilot && (days > 0 ? ` · Dans ${days} jour${days > 1 ? "s" : ""}` : days === 0 ? " · Aujourd'hui" : "")}
          </p>
          {students !== null && !pilot && (
            <p className="mt-1.5 flex items-center gap-2 text-[15px] text-foreground">
              <Users size={17} strokeWidth={1.6} className="text-muted" />
              {students} étudiant{students > 1 ? "s" : ""} attendu{students > 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div className="lg:pl-6">
          <p className="text-sm text-muted">Préparation du cours</p>
          <p className="mt-1 text-[17px] font-semibold text-foreground">
            {progress.completed} éléments complétés sur {progress.total}
          </p>
          <Segments items={items} />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href={`/gestion/enseignement/preparation/${s.id}`}
              className="label rounded-full bg-accent px-6 py-3.5 text-xs tracking-[0.12em] text-on-accent hover:bg-[#1b2221]"
            >
              Continuer la préparation
            </Link>
            <span
              className={`label rounded-full px-3.5 py-1.5 text-[11px] tracking-[0.1em] ${
                progress.ready ? "bg-surface text-foreground" : ATTENTION
              }`}
            >
              {progress.ready ? "Prêt" : "À compléter"}
            </span>
          </div>
        </div>
      </section>

      <div>
        <h3 className="font-title text-[24px] text-foreground">Préparer le cours</h3>
        <p className="text-sm text-muted">
          {pilot
            ? "Complétez les informations nécessaires avec le formateur, sur la même fiche de cours."
            : "Complétez chaque partie pour que les étudiants disposent de toutes les informations nécessaires."}
        </p>
      </div>

      <ul className="divide-y divide-border-soft overflow-hidden rounded-lg border border-border bg-background">
        {items.map((it) => (
          <li key={it.key}>
            <Link
              href={`/gestion/enseignement/preparation/${s.id}#${it.key}`}
              className="flex items-center gap-4 px-5 py-4 transition hover:bg-surface"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  it.done ? "bg-accent text-on-accent" : it.required ? ATTENTION : "bg-surface text-muted"
                }`}
              >
                {it.done ? (
                  <Check size={17} strokeWidth={2.2} />
                ) : it.required ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                ) : (
                  <Minus size={17} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold text-foreground">{it.label}</span>
                <span className="block truncate text-sm text-muted">{it.detail}</span>
              </span>
              <span
                className={`label shrink-0 rounded-full px-3 py-1 text-[10px] tracking-[0.1em] ${
                  it.done ? "bg-surface text-foreground" : it.required ? ATTENTION : "bg-surface text-muted"
                }`}
              >
                {it.done ? "Complété" : it.required ? "À compléter" : "Facultatif"}
              </span>
              <ChevronRight size={16} className="shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export function Segments({ items }: { items: { done: boolean }[] }) {
  return (
    <div className="mt-3 flex gap-1.5" aria-hidden="true">
      {items.map((it, i) => (
        <span key={i} className={`h-1.5 flex-1 rounded-full ${it.done ? "bg-accent" : "bg-border"}`} />
      ))}
    </div>
  );
}

function List({ rows }: { rows: PrepRow[] }) {
  return (
    <ul className="divide-y divide-border-soft overflow-hidden rounded-lg border border-border bg-background">
      {rows.map(({ s, items, progress, students }) => (
        <li key={s.id}>
          <Link
            href={`/gestion/enseignement/preparation/${s.id}`}
            className="flex flex-wrap items-center gap-4 px-5 py-4 transition hover:bg-surface"
          >
            <span className="min-w-0 flex-1">
              <span className="block font-title text-[19px] text-foreground">
                {formatSessionDate(s.session_date)}
              </span>
              <span className="block text-[15px] text-foreground">{titleOf(s)}</span>
              <span className="block text-sm text-muted">
                {formatTimeRange(s.start_time, s.end_time)} · {s.location}
                {s.room ? ` · ${s.room}` : ""}
                {students !== null ? ` · ${students} étudiant${students > 1 ? "s" : ""}` : ""}
              </span>
            </span>
            <span className="w-[200px] max-w-full">
              <span className="block text-sm text-muted">
                {progress.completed} sur {progress.total} complétés
              </span>
              <Segments items={items} />
            </span>
            <span
              className={`label rounded-full px-3 py-1 text-[10px] tracking-[0.1em] ${
                progress.ready ? "bg-surface text-foreground" : ATTENTION
              }`}
            >
              {progress.ready ? "Prêt" : "À compléter"}
            </span>
            <ChevronRight size={16} className="text-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

const FILTERS: { key: UpcomingFilter; label: string }[] = [
  { key: "tous", label: "Tous" },
  { key: "a-completer", label: "À compléter" },
  { key: "prets", label: "Prêts" },
  { key: "sans-formateur", label: "Sans formateur" },
];

/** « Brouillon » : cours pas encore publié ; sinon « À compléter » puis « Prêt » quand tout l'est. */
function stateOf(r: PrepRow) {
  if (r.s.is_draft) return { label: "Brouillon", cls: "bg-surface text-muted" };
  if (r.progress.ready) return { label: "Prêt", cls: "bg-m-apostolique/25 text-foreground" };
  return { label: "À compléter", cls: ATTENTION };
}

function UpcomingTable({
  rows,
  filter,
  ministryColor,
  ministry,
}: {
  rows: PrepRow[];
  filter: { current: UpcomingFilter; hrefFor: (f: UpcomingFilter) => string; options?: UpcomingFilter[] };
  ministryColor: string;
  ministry?: { slug: string; name: string; id?: string };
}) {
  const noTeacher = (r: PrepRow) => !r.s.teacher && !r.s.speaker_name;
  const shown = rows.filter((r) =>
    filter.current === "prets"
      ? r.progress.ready
      : filter.current === "a-completer"
        ? !r.progress.ready
        : filter.current === "sans-formateur"
          ? noTeacher(r)
          : true
  );
  const options = FILTERS.filter((f) => (filter.options ?? ["tous", "a-completer", "prets"]).includes(f.key));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
      <nav className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-background p-1" aria-label="Filtrer les cours">
        {options.map((f) => (
          <Link
            key={f.key}
            href={filter.hrefFor(f.key)}
            aria-current={filter.current === f.key ? "page" : undefined}
            className={`rounded-md px-5 py-2.5 text-[15px] transition ${
              filter.current === f.key ? "bg-accent font-medium text-on-accent" : "text-muted hover:text-foreground"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      {ministry?.id && <AddCourseDialog ministryId={ministry.id} drafts={DRAFTS_ENABLED} />}
      </div>

      {shown.length ? (
        <section className="rounded-2xl border border-border bg-background px-5 pb-1 pt-4 sm:px-6">
          {!ministry && <p className="text-[13px] font-semibold text-muted">Prochain cours</p>}
          <ul className="divide-y divide-border-soft">
            {shown.map((r) => {
              const { s } = r;
              const state = stateOf(r);
              const color = sessionColor(s.track, "commun", ministryColor);
              return (
                <li key={s.id}>
                  <Link
                    href={`/gestion/enseignement/preparation/${s.id}`}
                    className="grid items-center gap-x-5 gap-y-2 py-4 transition hover:opacity-80 sm:grid-cols-[190px_auto_1fr_auto_auto]"
                  >
                    <span className="block">
                      <span className="block text-[16px] font-semibold text-foreground">
                        {formatSessionDate(s.session_date).toLowerCase()} {s.session_date.slice(0, 4)}
                      </span>
                      <span className="block text-[14px] text-muted">{formatTimeRangeFr(s.start_time, s.end_time)}</span>
                    </span>
                    <span>
                      {ministry ? (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-foreground"
                          style={{ background: `color-mix(in srgb, ${ministryColor} 28%, transparent)` }}
                        >
                          <MinistryPicto slug={ministry.slug} size={14} />
                          {ministry.name}
                        </span>
                      ) : (
                        s.track && (
                          <span
                            className="label inline-block rounded-full px-3 py-1.5 text-[12px] tracking-[0.06em] text-foreground"
                            style={{ background: `color-mix(in srgb, ${color} 28%, transparent)` }}
                          >
                            {s.track}
                          </span>
                        )
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[17px] font-semibold text-foreground">{titleOf(s)}</span>
                      <span className="block text-[14px] text-muted">
                        {ministry ? `${s.teacher?.full_name ?? s.speaker_name ?? "Formateur à affecter"} · ` : ""}
                        {s.location}
                        {s.room ? ` · ${s.room}` : ""}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-1.5 sm:items-end">
                      {ministry && (
                        <span className="text-[13px] text-muted">
                          {r.progress.completed} éléments sur {r.progress.total}
                        </span>
                      )}
                      <span className={`label w-fit rounded-full px-3.5 py-1.5 text-[12px] tracking-[0.06em] ${state.cls}`}>
                        {state.label}
                      </span>
                    </span>
                    <ChevronRight size={18} className="hidden text-muted sm:block" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <Empty text="Aucun cours dans cette liste." />
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <section className="rounded-lg border border-border bg-background p-6">
      <p className="text-[15px] text-muted">{text}</p>
    </section>
  );
}
