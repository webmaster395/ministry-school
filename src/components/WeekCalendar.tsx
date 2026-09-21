"use client";

import { useEffect, useState } from "react";

export type CalendarSession = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  room: string | null;
  teacher?: string | null;
  course?: string | null;
  /** Couleur du ministère de la séance (variable CSS) ; encre pour le tronc commun */
  color?: string;
};

const INK = "var(--foreground)";

function startOfWeek(date: Date) {
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function toISODate(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

const dayLabels = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];

function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${iso}T00:00:00`));
}

function SessionRow({
  session,
  showDate,
  accent,
}: {
  session: CalendarSession;
  showDate: boolean;
  accent: boolean;
}) {
  const time = `${session.start_time.slice(0, 5)} – ${session.end_time.slice(0, 5)}`;
  const place = `${session.location}${session.room ? ` · ${session.room}` : ""}`;

  return (
    <li
      className="border-l-[3px] pl-3"
      style={{ borderLeftColor: accent ? (session.color ?? INK) : "var(--border)" }}
    >
      <p className="label text-xs tracking-[0.1em] text-muted">
        {showDate ? `${formatShortDate(session.date)} · ${time}` : time}
      </p>
      <p className="text-[15px] font-medium text-foreground">{session.course ?? "Séance"}</p>
      <p className="text-sm text-muted">
        {place}
        {session.teacher ? ` · ${session.teacher}` : ""}
      </p>
    </li>
  );
}

export default function WeekCalendar({ sessions }: { sessions: CalendarSession[] }) {
  // "Aujourd'hui" dépend du fuseau du visiteur : on l'établit après le montage
  // pour que le rendu serveur et le rendu client concordent.
  const [today, setToday] = useState<Date | null>(null);
  const [weekStart, setWeekStart] = useState<Date | null>(null);
  const [selected, setSelected] = useState<Date | null>(null);

  useEffect(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lu après le montage pour éviter un écart serveur/navigateur
    setToday(now);
    setWeekStart(startOfWeek(now));
    setSelected(now);
  }, []);

  if (!today || !weekStart || !selected) {
    return (
      <div className="rounded-lg border border-border bg-background p-5">
        <div className="h-6 w-32 rounded bg-surface" />
        <div className="mt-4 grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="h-14 rounded bg-surface" />
          ))}
        </div>
        <div className="mt-5 h-28 rounded-md bg-surface" />
      </div>
    );
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(
    weekStart
  );

  const sessionsByDate = new Map<string, CalendarSession[]>();
  for (const s of sessions) {
    const list = sessionsByDate.get(s.date) ?? [];
    list.push(s);
    sessionsByDate.set(s.date, list);
  }

  const selectedIso = toISODate(selected);
  const todayIso = toISODate(today);
  const selectedSessions = sessionsByDate.get(selectedIso) ?? [];

  // Aucune séance le jour choisi : on montre les deux prochaines à venir
  const upcoming = [...sessions]
    .filter((s) => s.date >= todayIso)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))
    .slice(0, 2);

  function shiftWeek(delta: number) {
    setWeekStart((current) => {
      if (!current) return current;
      const next = new Date(current);
      next.setDate(current.getDate() + delta * 7);
      return next;
    });
  }

  return (
    <div className="rounded-lg border border-border bg-background p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="label text-[13px] tracking-[0.1em] text-foreground">{monthLabel}</p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            aria-label="Semaine précédente"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted transition hover:border-foreground hover:text-foreground"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            aria-label="Semaine suivante"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted transition hover:border-foreground hover:text-foreground"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((d, i) => {
          const iso = toISODate(d);
          const isSelected = iso === selectedIso;
          const isToday = iso === todayIso;
          const daySessions = sessionsByDate.get(iso);
          const color = daySessions?.[0]?.color ?? INK;

          return (
            <button
              type="button"
              key={iso}
              onClick={() => setSelected(d)}
              className="flex flex-col items-center gap-1 py-1"
            >
              <span className="label text-[10px] tracking-[0.08em] !font-medium text-muted">
                {dayLabels[i]}
              </span>
              <span
                className={`flex h-[34px] w-[34px] items-center justify-center rounded-full text-sm transition ${
                  isSelected
                    ? "bg-foreground font-medium text-on-accent"
                    : "text-foreground hover:bg-foreground/[0.06]"
                }`}
                style={!isSelected && isToday ? { boxShadow: `inset 0 0 0 1px ${color}` } : undefined}
              >
                {d.getDate()}
              </span>
              <span
                className="h-[5px] w-[5px] rounded-full"
                style={{ background: daySessions && !isSelected ? color : "transparent" }}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-5 border-t border-border-soft pt-4">
        {selectedSessions.length ? (
          <>
            <p className="label mb-3 text-[11px] tracking-[0.14em] text-muted">Ce jour</p>
            <ul className="space-y-4">
              {selectedSessions.map((s) => (
                <SessionRow key={s.id} session={s} showDate={false} accent />
              ))}
            </ul>
          </>
        ) : upcoming.length ? (
          <>
            <p className="label mb-3 text-[11px] tracking-[0.14em] text-muted">
              Prochaines séances
            </p>
            <ul className="space-y-4">
              {upcoming.map((s, i) => (
                <SessionRow key={s.id} session={s} showDate accent={i === 0} />
              ))}
            </ul>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <p className="font-title text-lg text-foreground">Journée libre !</p>
            <p className="text-sm text-muted">Aucun cours n&apos;est planifié à venir.</p>
          </div>
        )}
      </div>
    </div>
  );
}
