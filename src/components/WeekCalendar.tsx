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
};

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

export default function WeekCalendar({ sessions }: { sessions: CalendarSession[] }) {
  // "Aujourd'hui" dépend du fuseau du visiteur : on l'établit après le montage
  // pour que le rendu serveur et le rendu client concordent.
  const [today, setToday] = useState<Date | null>(null);
  const [weekStart, setWeekStart] = useState<Date | null>(null);
  const [selected, setSelected] = useState<Date | null>(null);

  useEffect(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
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
        <p className="text-sm font-semibold capitalize text-foreground">{monthLabel}</p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            aria-label="Semaine précédente"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted transition hover:bg-surface"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            aria-label="Semaine suivante"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted transition hover:bg-surface"
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
          const hasSession = sessionsByDate.has(iso);

          return (
            <button
              type="button"
              key={iso}
              onClick={() => setSelected(d)}
              className="flex flex-col items-center gap-1 py-1"
            >
              <span className="text-[11px] text-muted">{dayLabels[i]}</span>
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition ${
                  isSelected
                    ? "bg-accent font-medium text-on-accent"
                    : isToday
                      ? "border border-accent text-accent"
                      : "text-foreground hover:bg-surface"
                }`}
              >
                {d.getDate()}
              </span>
              <span
                className={`h-1 w-1 rounded-full ${hasSession && !isSelected ? "bg-accent" : "bg-transparent"}`}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-md bg-surface px-4 py-6">
        {selectedSessions.length ? (
          <ul className="space-y-3">
            {selectedSessions.map((s) => (
              <li key={s.id} className="text-sm">
                <p className="font-medium text-foreground">
                  {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                </p>
                {s.course && <p className="text-foreground">{s.course}</p>}
                <p className="text-muted">
                  {s.location}
                  {s.room ? ` · ${s.room}` : ""}
                </p>
                {s.teacher && (
                  <p className="text-muted">
                    Intervenant : <strong className="font-medium text-foreground">{s.teacher}</strong>
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="text-accent"
            >
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
              <path d="m9.5 14.5 5 5M14.5 14.5l-5 5" />
            </svg>
            <p className="text-sm font-semibold text-foreground">Journée libre !</p>
            <p className="text-sm text-muted">Aucun cours n&apos;est planifié pour ce jour.</p>
          </div>
        )}
      </div>
    </div>
  );
}
