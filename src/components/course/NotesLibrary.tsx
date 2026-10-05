"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";

export type NoteLibraryItem = {
  id: string;
  sessionId: string;
  title: string;
  course: string;
  date: string;
  dateLabel: string;
  hours: string;
  monthKey: string;
  monthLabel: string;
};

export default function NotesLibrary({ notes }: { notes: NoteLibraryItem[] }) {
  const [query, setQuery] = useState("");
  const groups = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("fr-FR");
    const filtered = notes.filter((note) =>
      `${note.title} ${note.course}`
        .toLocaleLowerCase("fr-FR")
        .includes(search),
    );
    const byMonth = new Map<
      string,
      { label: string; notes: NoteLibraryItem[] }
    >();
    for (const note of filtered) {
      const group = byMonth.get(note.monthKey) ?? {
        label: note.monthLabel,
        notes: [],
      };
      group.notes.push(note);
      byMonth.set(note.monthKey, group);
    }
    return [...byMonth.entries()].map(([key, value]) => ({ key, ...value }));
  }, [notes, query]);

  return (
    <div>
      <label className="flex min-h-12 max-w-xl items-center gap-3 border-b border-border px-1">
        <Search size={18} className="shrink-0 text-muted" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher une note ou un cours"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted"
        />
      </label>

      <div className="mt-9 space-y-10">
        {groups.map((group) => (
          <section key={group.key}>
            <h2 className="label mb-3 text-xs tracking-[0.14em] text-muted">
              {group.label}
            </h2>
            <div className="border-t border-border">
              {group.notes.map((note) => (
                <Link
                  key={note.id}
                  href={`/etudiant/notes/${note.sessionId}`}
                  className="group flex min-h-[92px] touch-manipulation items-center gap-4 border-b border-border px-1 py-4 transition hover:bg-background sm:px-3"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="font-title truncate text-[19px] text-foreground sm:text-[21px]">
                      {note.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-6 text-muted">
                      {note.course} · {note.dateLabel} · {note.hours}
                    </p>
                  </div>
                  <ArrowRight
                    size={19}
                    className="shrink-0 text-muted transition group-hover:translate-x-1 group-hover:text-foreground"
                  />
                </Link>
              ))}
            </div>
          </section>
        ))}

        {groups.length === 0 && (
          <div className="border-t border-border py-14 text-center">
            <p className="font-title text-xl text-foreground">
              Aucune note trouvée
            </p>
            <p className="mt-2 text-sm text-muted">
              Tes notes apparaîtront ici dès que tu écriras depuis une page de
              cours.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
