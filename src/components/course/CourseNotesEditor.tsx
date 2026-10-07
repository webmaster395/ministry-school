"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bold,
  Check,
  ChevronDown,
  Copy,
  Highlighter,
  Mail,
  Underline,
} from "lucide-react";
import { emailCourseNote, saveCourseNote } from "@/app/etudiant/notes/actions";

type SaveState = "idle" | "saving" | "saved" | "error";

export default function CourseNotesEditor({
  sessionId,
  initialHtml,
  heading = "Mes notes",
  showLibraryLink = true,
}: {
  sessionId: string;
  initialHtml: string;
  heading?: string;
  showLibraryLink?: boolean;
}) {
  const editor = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (initialized.current || !editor.current) return;
    editor.current.innerHTML = initialHtml;
    initialized.current = true;
  }, [initialHtml]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function run(command: string, value?: string) {
    editor.current?.focus();
    document.execCommand(command, false, value);
    scheduleSave();
  }

  function scheduleSave() {
    if (timer.current) clearTimeout(timer.current);
    setState("saving");
    timer.current = setTimeout(async () => {
      const html = editor.current?.innerHTML ?? "";
      const text = editor.current?.innerText ?? "";
      try {
        await saveCourseNote(sessionId, html, text);
        setState("saved");
      } catch {
        setState("error");
      }
    }, 700);
  }

  async function copyNotes() {
    await navigator.clipboard.writeText(editor.current?.innerText ?? "");
    setMessage("Notes copiées");
    setTimeout(() => setMessage(""), 2200);
  }

  async function sendNotes() {
    setMessage("Envoi…");
    try {
      if (timer.current) clearTimeout(timer.current);
      await saveCourseNote(
        sessionId,
        editor.current?.innerHTML ?? "",
        editor.current?.innerText ?? "",
      );
      await emailCourseNote(sessionId);
      setState("saved");
      setMessage("Notes envoyées par e-mail");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Envoi impossible");
    }
  }

  const tool =
    "grid h-10 min-w-0 place-items-center rounded-lg px-1 text-xs font-semibold text-muted transition hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground sm:h-9 sm:min-w-9 sm:px-2";

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-background shadow-[0_10px_35px_rgba(39,48,47,0.06)]">
      <header className={`flex items-center justify-between gap-2 px-3.5 py-3 sm:px-4 ${open ? "border-b border-border-soft" : ""}`}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={`course-notes-${sessionId}`}
          className="flex min-h-10 min-w-0 flex-1 items-center justify-between gap-3 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          <span className="min-w-0">
            <span className="font-title block text-lg text-foreground">{heading}</span>
          <p className="mt-0.5 text-[11px] text-muted">
            {state === "saving" && "Enregistrement…"}
            {state === "saved" && (
              <span className="inline-flex items-center gap-1">
                <Check size={12} /> Enregistré
              </span>
            )}
            {state === "error" && "Échec de l’enregistrement — réessaie"}
            {state === "idle" && "Sauvegarde automatique"}
          </p>
          </span>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={`shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
        {showLibraryLink && (
          <Link
            href="/etudiant/notes"
            className="hidden text-xs font-semibold text-foreground hover:underline min-[390px]:block"
          >
            Toutes mes notes
          </Link>
        )}
      </header>
      <div id={`course-notes-${sessionId}`} hidden={!open}>
        <div
          className="grid grid-cols-5 gap-1 border-b border-border-soft px-2.5 py-2 sm:flex sm:flex-wrap sm:px-3"
          aria-label="Mise en forme des notes"
        >
        <button
          type="button"
          onClick={() => run("formatBlock", "h2")}
          className={tool}
          title="Titre H2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => run("formatBlock", "h3")}
          className={tool}
          title="Titre H3"
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => run("bold")}
          className={tool}
          title="Gras"
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onClick={() => run("underline")}
          className={tool}
          title="Souligné"
        >
          <Underline size={16} />
        </button>
        <button
          type="button"
          onClick={() => run("hiliteColor", "#f4df89")}
          className={tool}
          title="Surligner"
        >
          <Highlighter size={16} />
        </button>
        </div>
        <div
          ref={editor}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Notes personnelles du cours"
          data-placeholder="Écris librement pendant le cours…"
          onInput={scheduleSave}
          className="course-notes-editor min-h-[240px] max-h-[58dvh] scroll-pb-24 overflow-y-auto px-4 py-4 text-[16px] leading-7 text-foreground outline-none empty:before:pointer-events-none empty:before:text-muted/70 empty:before:content-[attr(data-placeholder)] sm:min-h-[270px] sm:px-5 sm:text-[15px] [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_mark]:rounded-sm [&_mark]:bg-[#f4df89] [&_mark]:px-0.5 [&_p]:my-2"
        />
        <div className="border-t border-border-soft px-4 py-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={copyNotes}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-foreground hover:bg-surface"
          >
            <Copy size={14} /> Copier
          </button>
          <button
            type="button"
            onClick={sendNotes}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-foreground px-3 text-xs font-semibold text-white hover:opacity-90"
          >
            <Mail size={14} /> Envoyer par e-mail
          </button>
        </div>
        {message && (
          <p className="mt-2 text-xs font-medium text-foreground" role="status">
            {message}
          </p>
        )}
        <p className="mt-2 text-[10px] leading-4 text-muted">
          Notes personnelles, visibles uniquement par vous. Conservez une copie par e-mail si nécessaire.
        </p>
        </div>
      </div>
    </section>
  );
}
