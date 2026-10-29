"use client";

import { CalendarDays, Check, Clock3, Zap } from "lucide-react";
import { useState } from "react";

type Mode = "now" | "scheduled";

function initialParis(value?: string | null) {
  if (!value) return { date: "", time: "09:00" };
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
}

export default function AvailabilityPicker({
  prefix = "availability",
  value,
  label = "Disponibilité",
  scheduled = false,
}: {
  prefix?: string;
  value?: string | null;
  label?: string;
  scheduled?: boolean;
}) {
  const [mode, setMode] = useState<Mode>(scheduled ? "scheduled" : "now");
  const initial = initialParis(value);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time === "24:00" ? "00:00" : initial.time);

  return (
    <fieldset className="rounded-2xl border border-border bg-background p-3 sm:p-4">
      <legend className="px-1 text-sm font-semibold text-foreground">{label}</legend>
      <input type="hidden" name={`${prefix}_mode`} value={mode} />
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface p-1" role="group" aria-label={label}>
        {([
          ["now", "Maintenant", Zap],
          ["scheduled", "Programmer", CalendarDays],
        ] as const).map(([key, text, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            aria-pressed={mode === key}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
              mode === key
                ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Icon size={16} /> {text}
          </button>
        ))}
      </div>

      {mode === "scheduled" ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted">
              <CalendarDays size={14} /> Date
            </span>
            <input
              type="date"
              name={`${prefix}_date`}
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="min-h-12 w-full rounded-xl border border-border bg-background px-3 text-[15px] text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted">
              <Clock3 size={14} /> Heure de Paris
            </span>
            <input
              type="time"
              name={`${prefix}_time`}
              required
              step={60}
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="min-h-12 w-full rounded-xl border border-border bg-background px-3 text-[15px] text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </label>
          <p className="flex items-center gap-2 text-xs text-muted sm:col-span-2">
            <Clock3 size={14} /> Publication automatique selon le fuseau Europe/Paris.
          </p>
        </div>
      ) : (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-surface px-3 py-2.5 text-sm text-foreground">
          <Check size={16} className="text-accent" /> Accessible dès l’enregistrement.
        </p>
      )}
    </fieldset>
  );
}

