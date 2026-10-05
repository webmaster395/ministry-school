"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Copy, ExternalLink, Mail, Search } from "lucide-react";
import { emailCourseNote } from "@/app/etudiant/notes/actions";

export type NoteLibraryItem = {
  id: string;
  sessionId: string;
  course: string;
  date: string;
  dateLabel: string;
  trainers: string[];
  category: string;
  html: string;
  text: string;
  updatedLabel: string;
};

export default function NotesLibrary({ notes }: { notes: NoteLibraryItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Toutes");
  const [message, setMessage] = useState("");
  const categories = useMemo(
    () => [
      "Toutes",
      ...Array.from(
        new Set(notes.map((note) => note.category).filter(Boolean)),
      ),
    ],
    [notes],
  );
  const filtered = notes.filter((note) => {
    const haystack =
      `${note.course} ${note.text} ${note.trainers.join(" ")} ${note.category}`.toLowerCase();
    return (
      (category === "Toutes" || note.category === category) &&
      haystack.includes(query.trim().toLowerCase())
    );
  });

  async function copy(note: NoteLibraryItem) {
    await navigator.clipboard.writeText(note.text);
    setMessage(`Notes de « ${note.course} » copiées`);
  }

  async function email(note: NoteLibraryItem) {
    setMessage("Envoi…");
    try {
      await emailCourseNote(note.sessionId);
      setMessage("Notes envoyées par e-mail");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Envoi impossible");
    }
  }

  return (
    <div>
      <div className="grid gap-3 rounded-2xl border border-border bg-background p-4 sm:grid-cols-[1fr_auto]">
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-3">
          <Search size={17} className="text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher dans mes notes"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
        >
          {categories.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>
      {message && (
        <p className="mt-3 text-sm font-medium text-foreground" role="status">
          {message}
        </p>
      )}
      <div className="mt-6 space-y-4">
        {filtered.map((note) => (
          <article
            key={note.id}
            className="rounded-2xl border border-border bg-background px-5 py-5 sm:px-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span className="rounded-full bg-surface px-2.5 py-1 font-medium">
                    {note.category || "Cours"}
                  </span>
                  <time dateTime={note.date}>{note.dateLabel}</time>
                </div>
                <h2 className="font-title mt-2 text-xl text-foreground">
                  {note.course}
                </h2>
                {note.trainers.length > 0 && (
                  <p className="mt-1 text-sm text-muted">
                    {note.trainers.join(" · ")}
                  </p>
                )}
              </div>
              <Link
                href={`/etudiant/seances/${note.sessionId}`}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border px-4 text-xs font-semibold text-foreground hover:bg-surface"
              >
                Retour au cours <ExternalLink size={13} />
              </Link>
            </div>
            <details className="group mt-4 border-t border-border-soft pt-4">
              <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
                <span className="group-open:hidden">Ouvrir la note</span>
                <span className="hidden group-open:inline">
                  Réduire la note
                </span>
                <span className="ml-2 text-xs font-normal text-muted">
                  {note.text.slice(0, 140)}
                  {note.text.length > 140 ? "…" : ""}
                </span>
              </summary>
              <div
                className="course-note-render mt-4 max-w-[70ch] text-[15px] leading-7 text-foreground [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-4 [&_h3]:font-semibold [&_mark]:bg-[#f4df89] [&_p]:my-2"
                dangerouslySetInnerHTML={{ __html: note.html }}
              />
            </details>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border-soft pt-4">
              <button
                type="button"
                onClick={() => copy(note)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-foreground hover:bg-surface"
              >
                <Copy size={14} /> Copier
              </button>
              <button
                type="button"
                onClick={() => email(note)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-foreground px-3 text-xs font-semibold text-white"
              >
                <Mail size={14} /> M’envoyer par e-mail
              </button>
              <span className="ml-auto text-xs text-muted">
                Modifié {note.updatedLabel}
              </span>
            </div>
          </article>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
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
