"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

export default function FormSubmitButton({
  label = "Enregistrer",
  pendingLabel = "Enregistrement…",
  successLabel = "Enregistré",
  className,
  name,
  value,
  disabled = false,
}: {
  label?: string;
  pendingLabel?: string;
  successLabel?: string;
  className: string;
  name?: string;
  value?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const [activated, setActivated] = useState(false);
  const [saved, setSaved] = useState(false);
  const submitted = useRef(false);

  useEffect(() => {
    if (pending && activated) {
      submitted.current = true;
      return;
    }
    if (pending || !submitted.current) return;
    submitted.current = false;
    const showTimer = window.setTimeout(() => setSaved(true), 0);
    const resetTimer = window.setTimeout(() => {
      setSaved(false);
      setActivated(false);
    }, 2400);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(resetTimer);
    };
  }, [activated, pending]);

  const working = pending && activated;

  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={disabled || pending}
      onClick={() => {
        setActivated(true);
        setSaved(false);
      }}
      aria-live="polite"
      className={`${className} inline-flex items-center justify-center gap-2 disabled:cursor-wait disabled:opacity-70 ${
        saved ? "!bg-emerald-700 !text-white" : ""
      }`}
    >
      {working ? (
        <Loader2 size={15} className="shrink-0 animate-spin" aria-hidden="true" />
      ) : saved ? (
        <Check size={16} className="shrink-0" aria-hidden="true" />
      ) : null}
      <span>{working ? pendingLabel : saved ? successLabel : label}</span>
    </button>
  );
}
