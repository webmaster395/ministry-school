"use client";

import { useFormStatus } from "react-dom";

// Un second clic renverrait le jeton déjà consommé par le premier : on bloque le bouton.
export default function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="label w-full rounded-lg bg-foreground px-5 py-3.5 text-sm tracking-[0.12em] text-on-accent transition hover:bg-[#1b2221] disabled:opacity-60"
    >
      {pending ? "Activation…" : "Activer mon compte"}
    </button>
  );
}
