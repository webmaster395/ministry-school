import Link from "next/link";
import { CalendarDays, Check, ChevronRight, MapPin, Minus, Users } from "lucide-react";
import { formatSessionDate, formatTimeRange } from "@/lib/format";
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
}: {
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
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "prochain" &&
        (next ? <Next row={next} today={today} ministryColor={ministryColor} /> : <Empty text="Aucun cours à venir." />)}
      {tab === "avenir" &&
        (later.length ? <List rows={later} /> : <Empty text="Aucun autre cours à venir." />)}
      {tab === "passes" && (past.length ? <List rows={past} /> : <Empty text="Aucun cours passé pour le moment." />)}
    </div>
  );
}

function Next({ row, today, ministryColor }: { row: PrepRow; today: string; ministryColor: string }) {
  const { s, items, progress, students } = row;
  const color = sessionColor(s.track, "commun", ministryColor);
  const days = Math.round(
    (new Date(s.session_date).getTime() - new Date(today).getTime()) / 86400000
  );
  const teacher = s.teacher?.full_name ?? s.speaker_name;

  return (
    <>
      <section
        className="grid gap-6 rounded-lg border border-border border-t-[3px] bg-background p-6 sm:p-7 lg:grid-cols-[1fr_360px] lg:divide-x lg:divide-border-soft"
        style={{ borderTopColor: color }}
      >
        <div>
          {s.track && (
            <span
              className="label rounded-full px-3 py-1 text-[11px] tracking-[0.1em] text-foreground"
              style={{ background: `color-mix(in srgb, ${color} 30%, transparent)` }}
            >
              {s.track}
            </span>
          )}
          <h3 className="font-title mt-5 text-[30px] leading-tight text-foreground">{titleOf(s)}</h3>
          <p className="mt-4 flex items-center gap-2 text-[15px] text-muted">
            <CalendarDays size={17} strokeWidth={1.6} />
            {formatSessionDate(s.session_date)} · {formatTimeRange(s.start_time, s.end_time)}
          </p>
          <p className="mt-1.5 flex items-center gap-2 text-[15px] text-muted">
            <MapPin size={17} strokeWidth={1.6} />
            {s.location}
            {s.room ? ` · ${s.room}` : ""}
            {teacher ? ` · ${teacher}` : ""}
            {days > 0 ? ` · Dans ${days} jour${days > 1 ? "s" : ""}` : days === 0 ? " · Aujourd'hui" : ""}
          </p>
          {students !== null && (
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
              href={`/etudiant/preparation/${s.id}`}
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
          Complétez chaque partie pour que les étudiants disposent de toutes les informations nécessaires.
        </p>
      </div>

      <ul className="divide-y divide-border-soft overflow-hidden rounded-lg border border-border bg-background">
        {items.map((it) => (
          <li key={it.key}>
            <Link
              href={`/etudiant/preparation/${s.id}#${it.key}`}
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
            href={`/etudiant/preparation/${s.id}`}
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

function Empty({ text }: { text: string }) {
  return (
    <section className="rounded-lg border border-border bg-background p-6">
      <p className="text-[15px] text-muted">{text}</p>
    </section>
  );
}
