"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MapPin, RefreshCw, UserRound } from "lucide-react";
import CalendarSyncDialog from "@/components/CalendarSyncDialog";

export type MonthSession = {
  id: string;
  date: string; // AAAA-MM-JJ
  start: string;
  end: string;
  title: string;
  label: string;
  location: string;
  teacher: string | null;
  color: string;
};

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const WEEKDAYS = ["Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam.", "Dim."];

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const hm = (t: string) => t.slice(0, 5).replace(":", " h ").replace(/ h 00$/, " h");

function longDate(d: string) {
  const s = new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function MonthCalendar({
  sessions,
  initialDate,
  subscribeUrl,
}: {
  sessions: MonthSession[];
  initialDate?: string;
  subscribeUrl?: string | null;
}) {
  const [syncOpen, setSyncOpen] = useState(false);
  const firstDate = sessions.find((s) => s.date >= new Date().toISOString().slice(0, 10))?.date;
  const start =
    initialDate ?? firstDate ?? sessions[0]?.date ?? new Date().toISOString().slice(0, 10);

  const [year, setYear] = useState(Number(start.slice(0, 4)));
  const [month, setMonth] = useState(Number(start.slice(5, 7)) - 1);
  const [selected, setSelected] = useState<string>(start);
  const [today, setToday] = useState<string | null>(null);

  // La date du jour n'est connue qu'après le montage (évite un écart serveur/client)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lu après le montage pour éviter un écart serveur/navigateur
    setToday(new Date().toISOString().slice(0, 10));
  }, []);

  const byDate = new Map<string, MonthSession[]>();
  for (const s of sessions) byDate.set(s.date, [...(byDate.get(s.date) ?? []), s]);

  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // lundi en premier
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((offset + daysInMonth) / 7) * 7 }, (_, i) => {
    const d = i - offset + 1;
    return d >= 1 && d <= daysInMonth ? d : null;
  });

  function go(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  function goToday() {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth());
    setSelected(iso(t.getFullYear(), t.getMonth(), t.getDate()));
  }

  const daySessions = byDate.get(selected) ?? [];
  const isNext = selected === firstDate;
  const isPast = !!today && selected < today;

  return (
    <div>
      <div className="mb-5 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={() => setSyncOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-foreground bg-background px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-surface"
        >
          <RefreshCw size={16} strokeWidth={1.8} />
          <span className="hidden sm:inline">Synchroniser avec mon calendrier</span>
          <span className="sm:hidden">Synchroniser</span>
        </button>
        <button
          type="button"
          onClick={goToday}
          className="rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition hover:border-foreground"
        >
          Aujourd&apos;hui
        </button>
      </div>
      <CalendarSyncDialog open={syncOpen} onClose={() => setSyncOpen(false)} subscribeUrl={subscribeUrl ?? null} />

      <div className="grid items-start gap-[22px] lg:grid-cols-[1fr_400px]">
        <section className="rounded-lg border border-border bg-background p-4 sm:p-6">
          <div className="mb-5 flex items-center justify-center gap-3 sm:gap-6">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Mois précédent"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border transition hover:border-foreground"
            >
              <ChevronLeft size={18} strokeWidth={1.8} />
            </button>
            <h2 className="font-title min-w-0 flex-1 text-center text-[18px] text-foreground sm:min-w-[180px] sm:flex-none sm:text-[20px]">
              {MONTHS[month]} {year}
            </h2>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Mois suivant"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border transition hover:border-foreground"
            >
              <ChevronRight size={18} strokeWidth={1.8} />
            </button>
          </div>

          <div className="grid grid-cols-7 pb-2">
            {WEEKDAYS.map((w) => (
              <span key={w} className="label text-center text-[11px] tracking-[0.1em] text-muted">
                {w}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-border-soft">
            {cells.map((d, i) => {
              if (!d) return <div key={i} className="h-[62px] border-b border-r border-border-soft sm:h-[76px]" />;
              const key = iso(year, month, d);
              const list = byDate.get(key) ?? [];
              const isSel = key === selected;
              const isToday = key === today;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelected(key)}
                  className={`flex h-[62px] flex-col items-center justify-start gap-1 border-b border-r border-border-soft pt-2 transition hover:bg-surface sm:h-[76px] sm:pt-3 ${
                    isSel ? "bg-surface" : ""
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                      isSel ? "bg-accent text-on-accent" : isToday ? "ring-1 ring-foreground" : ""
                    } ${list.length || isSel ? "text-inherit" : "text-foreground"}`}
                  >
                    {d}
                  </span>
                  <span className="flex gap-1">
                    {list.slice(0, 4).map((s) => (
                      <span
                        key={s.id}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: s.color }}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-background p-6">
          <p className="text-[13px] text-muted">{isNext ? "Prochaine journée" : isPast ? "Journée passée" : "Journée sélectionnée"}</p>
          <h2 className="font-title mt-1 text-[19px] leading-tight text-foreground">
            {longDate(selected)}
          </h2>
          {daySessions[0] && (
            <p className="mt-1.5 border-b border-border-soft pb-4 text-[13px] text-muted">
              {daySessions[0].location}
            </p>
          )}

          {daySessions.length ? (
            <ul className="mt-4 space-y-3">
              {daySessions.map((s) => (
                <li
                  key={s.id}
                  className="rounded-lg border border-border border-l-4 transition hover:border-r-foreground hover:border-y-foreground"
                  style={{ borderLeftColor: s.color }}
                >
                  <Link
                    href={`/etudiant/seances/${s.id}`}
                    className="flex items-start gap-2 p-4"
                  >
                    <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[13px] font-semibold text-foreground">
                      {hm(s.start)} – {hm(s.end)}
                    </p>
                    <span
                      className="label rounded-full px-2.5 py-1 text-[10px] tracking-[0.08em] text-foreground"
                      style={{ background: `color-mix(in srgb, ${s.color} 28%, transparent)` }}
                    >
                      {s.label}
                    </span>
                  </div>
                  <p className="mt-2 text-[14.5px] leading-snug text-foreground">{s.title}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
                    {s.teacher && (
                      <span className="inline-flex items-center gap-1.5">
                        <UserRound size={15} strokeWidth={1.6} /> {s.teacher}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin size={15} strokeWidth={1.6} /> {s.location}
                    </span>
                  </p>
                    </div>
                    <ChevronRight size={16} className="mt-1 shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-sm text-muted">Aucune séance ce jour-là.</p>
          )}
        </section>
      </div>
    </div>
  );
}
