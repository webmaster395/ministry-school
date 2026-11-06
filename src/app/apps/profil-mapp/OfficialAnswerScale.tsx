"use client";

import { useRef } from "react";
import type { MappAnswerValue as AnswerValue } from "@/lib/mapp/types";

const defaultOptions: { value: AnswerValue; label: string }[] = [
  { value: 1, label: "Pas du tout vrai" },
  { value: 2, label: "Plutôt faux" },
  { value: 3, label: "Moyennement vrai" },
  { value: 4, label: "Plutôt vrai" },
  { value: 5, label: "Tout à fait vrai" },
];

export function AnswerScale({ questionNumber, value, onChange, labels }: { questionNumber: number; value?: AnswerValue; onChange: (value: AnswerValue) => void; labels?: readonly string[] }) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const options = labels && (labels.length === 4 || labels.length === 5)
    ? defaultOptions.slice(0, labels.length).map((option, index) => ({ ...option, label: labels[index] }))
    : defaultOptions;

  function moveSelection(currentIndex: number, direction: -1 | 1) {
    const nextIndex = (currentIndex + direction + options.length) % options.length;
    onChange(options[nextIndex].value);
    buttons.current[nextIndex]?.focus();
  }

  return <fieldset className="answer-scale answer-options answer-spectrum" role="radiogroup" aria-label={`Réponse à la question ${questionNumber}`}>
    <legend className="sr-only">Choisissez votre réponse</legend>
    <div className="spectrum-choices">
      {options.map((option, index) => <button key={String(option.value)} ref={(node) => { buttons.current[index] = node; }} type="button" role="radio" aria-label={`${option.value}. ${option.label}`} aria-checked={value === option.value} tabIndex={value === option.value || (value === undefined && index === 0) ? 0 : -1} className={`spectrum-choice${value === option.value ? " selected" : ""}`} onClick={() => onChange(option.value)} onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); moveSelection(index, 1); }
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); moveSelection(index, -1); }
      }}><span aria-hidden="true">✓</span></button>)}
    </div>
    <div className="spectrum-labels" aria-hidden="true"><span>{options[0].label}</span><span>{options.at(-1)?.label}</span></div>
  </fieldset>;
}
