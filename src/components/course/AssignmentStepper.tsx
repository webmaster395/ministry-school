"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { toggleAssignmentStep } from "@/app/etudiant/travail/actions";

type Step = { id: string; title: string; body: string };

function inline(value: string): ReactNode[] {
  return value
    .split(/(\*\*.*?\*\*|<u>.*?<\/u>)/g)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return (
          <strong key={index} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      if (part.startsWith("<u>") && part.endsWith("</u>"))
        return <u key={index}>{part.slice(3, -4)}</u>;
      return <span key={index}>{part}</span>;
    });
}

function StepBody({ value }: { value: string }) {
  const nodes: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length)
      nodes.push(
        <ul key={`l-${nodes.length}`} className="my-3 list-disc space-y-1 pl-5">
          {bullets.map((line, index) => (
            <li key={index}>{inline(line)}</li>
          ))}
        </ul>,
      );
    bullets = [];
  };
  value
    .trim()
    .split("\n")
    .forEach((raw, index) => {
      const line = raw.trim();
      if (!line) return flush();
      if (line.startsWith("- ")) return bullets.push(line.slice(2));
      flush();
      nodes.push(
        <p key={index} className="my-2.5">
          {inline(line)}
        </p>,
      );
    });
  flush();
  return (
    <div className="max-w-[62ch] text-[15px] leading-7 text-muted">{nodes}</div>
  );
}

export default function AssignmentStepper({
  assignmentId,
  title,
  intro,
  steps,
  completedIds,
  accent,
  deadlineDate,
}: {
  assignmentId: string;
  title: string;
  intro: string;
  steps: Step[];
  completedIds: string[];
  accent: string;
  deadlineDate?: string | null;
}) {
  const done = new Set(completedIds);
  const [open, setOpen] = useState(
    Math.max(
      0,
      steps.findIndex((step) => !done.has(step.id)),
    ),
  );
  const progress = steps.length ? (done.size / steps.length) * 100 : 0;
  return (
    <section
      className="border-t border-border py-8 sm:py-14"
      style={{ "--work-accent": accent } as CSSProperties}
    >
      <div className="max-w-3xl">
        <p className="label text-xs tracking-[0.18em] text-muted">
          Mettre en pratique
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-title text-[26px] text-foreground sm:text-3xl">
              À faire après le cours
            </h2>
            <p className="mt-2 max-w-[62ch] text-sm leading-6 text-muted">
              {intro}
            </p>
          </div>
          <p className="text-xs font-semibold text-foreground">
            {done.size}/{steps.length} parties terminées
          </p>
        </div>
        <div className="mt-4 h-0.5 overflow-hidden bg-border-soft">
          <span
            className="block h-full bg-[var(--work-accent)] transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-5 text-xs font-medium text-muted">{title}</p>
        <div className="mt-3 text-xs">
          <p className="font-semibold text-foreground">
            À terminer avant le prochain cours
          </p>
          {deadlineDate && (
            <p className="mt-0.5 text-muted">
              Prochain cours :{" "}
              {new Intl.DateTimeFormat("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(new Date(`${deadlineDate}T00:00:00`))}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 max-w-3xl border-t border-border">
        {steps.map((step, index) => {
          const complete = done.has(step.id);
          const active = open === index;
          return (
            <article key={step.id} className="border-b border-border">
              <button
                type="button"
                onClick={() => setOpen(active ? -1 : index)}
                className="flex min-h-16 w-full items-center gap-3 py-3.5 text-left sm:min-h-[70px] sm:gap-4 sm:py-4"
                aria-expanded={active}
              >
                <span
                  className={`w-7 shrink-0 text-sm font-semibold ${complete || active ? "text-[var(--work-accent)]" : "text-muted"}`}
                >
                  {complete ? (
                    <Check size={17} />
                  ) : (
                    String(index + 1).padStart(2, "0")
                  )}
                </span>
                <strong className="min-w-0 flex-1 text-base font-semibold text-foreground">
                  {step.title}
                </strong>
                {complete && (
                  <span className="hidden text-xs font-medium text-muted sm:block">
                    Terminé
                  </span>
                )}
                <ChevronDown
                  size={17}
                  className={`shrink-0 text-muted transition-transform duration-200 ${active ? "rotate-180" : ""}`}
                />
              </button>
              <div
                className={`grid transition-[grid-template-rows,opacity] duration-200 ${active ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
              >
                <div className="overflow-hidden">
                  <div className="pb-6 pl-10 sm:pl-11">
                    <StepBody value={step.body} />
                    <form action={toggleAssignmentStep} className="mt-4">
                      <input
                        type="hidden"
                        name="assignment_id"
                        value={assignmentId}
                      />
                      <input type="hidden" name="step_id" value={step.id} />
                      <input
                        type="hidden"
                        name="total_steps"
                        value={steps.length}
                      />
                      <input
                        type="hidden"
                        name="done"
                        value={complete ? "1" : "0"}
                      />
                      <button
                        type="submit"
                        className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition ${complete ? "bg-surface text-foreground" : "bg-[var(--work-accent)] text-white"}`}
                      >
                        <Check size={14} />
                        {complete
                          ? "Terminée — modifier"
                          : "Marquer cette partie terminée"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
