"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Check, Copy, Highlighter, Mail, Underline } from "lucide-react";
import { emailCourseNote, saveCourseNote } from "@/app/etudiant/notes/actions";

type SaveState = "idle" | "saving" | "saved" | "error";

export default function CourseNotesEditor({
  sessionId,
  initialHtml,
}: {
  sessionId: string;
  initialHtml: string;
}) {
  const editor = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");

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
    "grid h-9 min-w-9 place-items-center rounded-lg px-2 text-xs font-semibold text-muted transition hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-background shadow-[0_10px_35px_rgba(39,48,47,0.06)]">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border-soft px-4 py-3">
        <div>
          <h2 className="font-title text-lg text-foreground">Mes notes</h2>
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
        </div>
        <a
          href="/etudiant/notes"
          className="text-xs font-semibold text-foreground hover:underline"
        >
          Toutes mes notes
        </a>
      </header>
      <div
        className="flex flex-wrap gap-0.5 border-b border-border-soft px-3 py-2"
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
        className="course-notes-editor min-h-[270px] max-h-[56vh] overflow-y-auto px-5 py-4 text-[15px] leading-7 text-foreground outline-none empty:before:pointer-events-none empty:before:text-muted/70 empty:before:content-[attr(data-placeholder)] [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_mark]:rounded-sm [&_mark]:bg-[#f4df89] [&_mark]:px-0.5 [&_p]:my-2"
      />
      <div className="border-t border-border-soft px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyNotes}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-foreground hover:bg-surface"
          >
            <Copy size={14} /> Copier toutes mes notes
          </button>
          <button
            type="button"
            onClick={sendNotes}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-foreground px-3 text-xs font-semibold text-white hover:opacity-90"
          >
            <Mail size={14} /> M’envoyer mes notes par e-mail
          </button>
        </div>
        {message && (
          <p className="mt-2 text-xs font-medium text-foreground" role="status">
            {message}
          </p>
        )}
        <p className="mt-3 text-[11px] leading-5 text-muted">
          Vos notes sont personnelles et confidentielles. Elles ne sont visibles
          que par vous. Pensez à conserver une copie en vous les envoyant par
          e-mail ou en les copiant dans l’outil de votre choix.
        </p>
      </div>
    </section>
  );
}
