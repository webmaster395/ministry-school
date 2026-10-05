import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatSessionDate, formatTimeRange } from "@/lib/format";
import type { ProgramEntry } from "@/lib/data/admin-hub";
import QuickCourseForm from "@/components/admin/QuickCourseForm";

type Choice = { id: string; name: string };

export function DayList({ entries }: { entries: ProgramEntry[] }) {
  return (
    <ul className="divide-y divide-border-soft border-y border-border-soft">
      {entries.map((entry) => (
        <li key={entry.key}>
          <Link href={entry.href} className="group grid gap-1 py-3.5 transition hover:pl-2 sm:grid-cols-[130px_1fr_auto] sm:items-center sm:gap-4">
            <span className="text-sm font-semibold text-foreground">{formatTimeRange(entry.start, entry.end)}</span>
            <span className="min-w-0"><span className="block text-[16px] font-semibold text-foreground group-hover:text-link">{entry.title}</span><span className="mt-0.5 block truncate text-sm text-muted">{entry.sub}</span></span>
            <ChevronRight size={17} className="hidden text-muted sm:block" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function shiftMonth(month: string, amount: number) {
  const [year, value] = month.split("-").map(Number);
  const date = new Date(year, value - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string) {
  const [year, value] = month.split("-").map(Number);
  const label = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(year, value - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function ProgramTab({ entries, month, today, trainers, ministries }: {
  entries: ProgramEntry[];
  month?: string;
  today: string;
  trainers: Choice[];
  ministries: Choice[];
}) {
  const nextDate = entries.find((entry) => entry.date >= today)?.date ?? today;
  const selectedMonth = /^\d{4}-\d{2}$/.test(month ?? "") ? month! : nextDate.slice(0, 7);
  const grouped = new Map<string, ProgramEntry[]>();
  for (const entry of entries.filter((item) => item.date.startsWith(selectedMonth))) {
    grouped.set(entry.date, [...(grouped.get(entry.date) ?? []), entry]);
  }
  const pastCount = entries.filter((entry) => entry.date < today).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">Programme Ministry School</p>
          <h1 className="font-title mt-1 text-[30px] leading-tight text-foreground">Journées et cours</h1>
          <p className="mt-1 text-sm text-muted">Clique sur un cours pour modifier sa fiche et son contenu.</p>
        </div>
        <nav aria-label="Changer de mois" className="flex items-center gap-2">
          <Link href={`/gestion/admin?onglet=programme&mois=${shiftMonth(selectedMonth, -1)}`} aria-label="Mois précédent" className="rounded-full border border-border p-2 text-muted hover:text-foreground"><ChevronLeft size={18} /></Link>
          <span className="min-w-[150px] text-center text-sm font-semibold text-foreground">{monthLabel(selectedMonth)}</span>
          <Link href={`/gestion/admin?onglet=programme&mois=${shiftMonth(selectedMonth, 1)}`} aria-label="Mois suivant" className="rounded-full border border-border p-2 text-muted hover:text-foreground"><ChevronRight size={18} /></Link>
        </nav>
      </header>

      {[...grouped.entries()].length ? [...grouped.entries()].map(([date, list]) => {
        const courseEntries = list.filter((entry) => entry.kind === "course");
        const reference = courseEntries[0] ?? list[0];
        return (
          <section key={date} className="border-t border-border pt-5 first:border-t-0 first:pt-0">
            <div className="mb-3">
              <h2 className="font-title text-[22px] text-foreground">{formatSessionDate(date)} {date.slice(0, 4)}</h2>
              <p className="mt-0.5 text-sm text-muted">{reference.location}{reference.room ? ` · ${reference.room}` : ""} · {courseEntries.length} cours</p>
            </div>
            <DayList entries={list} />
            <QuickCourseForm date={date} dateLabel={`${formatSessionDate(date)} ${date.slice(0, 4)}`} parking={courseEntries.some((entry) => entry.parking)} trainers={trainers} ministries={ministries} />
          </section>
        );
      }) : (
        <section className="rounded-lg bg-surface px-5 py-8 text-center"><p className="text-sm text-muted">Aucune journée programmée en {monthLabel(selectedMonth).toLowerCase()}.</p></section>
      )}

      {pastCount > 0 && selectedMonth >= today.slice(0, 7) && (
        <Link href={`/gestion/admin?onglet=programme&mois=${shiftMonth(today.slice(0, 7), -1)}`} className="inline-block text-sm font-medium text-muted hover:text-foreground hover:underline">Voir les journées passées →</Link>
      )}
    </div>
  );
}
