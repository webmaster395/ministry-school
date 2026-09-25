"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useSpace } from "@/components/SpaceProvider";
import { sendCommunication, type CommunicationState } from "@/app/gestion/communication/actions";

export type CommunicationOption = {
  as: "admin" | "teacher" | "steering" | "service" | "project";
  /** Nom de la fonction, comme dans le menu des espaces */
  label: string;
  /** Ce qu'on choisit comme destinataires pour cette fonction */
  targetLabel: string;
  targets: { value: string; label: string }[];
};

const SPACE_TO_AS: Record<string, CommunicationOption["as"]> = {
  admin: "admin",
  teacher: "teacher",
  steering: "steering",
  services: "service",
  project: "project",
};

const field = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-[15px] text-foreground";
const label = "mb-1.5 block text-[14px] text-muted";

/**
 * Le formulaire d'envoi : on choisit d'abord la fonction au nom de laquelle on écrit (si l'on en a
 * plusieurs), puis les destinataires, qui dépendent de cette fonction.
 */
export default function CommunicationForm({ options }: { options: CommunicationOption[] }) {
  const { current } = useSpace();
  const initial = options.find((o) => o.as === SPACE_TO_AS[current?.key ?? ""]) ?? options[0];
  const [as, setAs] = useState(initial.as);
  const option = options.find((o) => o.as === as) ?? options[0];
  const [state, action, pending] = useActionState<CommunicationState, FormData>(sendCommunication, {});
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} action={action} className="grid gap-4 sm:grid-cols-2">
      {options.length > 1 ? (
        <div>
          <label className={label} htmlFor="c-as">Envoyer en tant que</label>
          <select id="c-as" name="as" value={as} onChange={(e) => setAs(e.target.value as typeof as)} className={field}>
            {options.map((o) => (
              <option key={o.as} value={o.as}>{o.label}</option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="as" value={option.as} />
      )}

      <div className={options.length > 1 ? "" : "sm:col-span-2"}>
        <label className={label} htmlFor="c-target">{option.targetLabel}</label>
        <select id="c-target" name="target" key={option.as} required defaultValue={option.targets[0]?.value ?? ""} className={field}>
          {option.targets.length === 0 && <option value="">Aucun destinataire pour cette fonction</option>}
          {option.targets.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <label className={label} htmlFor="c-title">Objet</label>
        <input id="c-title" name="title" required className={field} placeholder="Changement de salle pour samedi" />
      </div>

      <div className="sm:col-span-2">
        <label className={label} htmlFor="c-body">Message</label>
        <textarea id="c-body" name="body" required rows={5} className={field} />
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg border border-m-doctoral/30 bg-m-doctoral/10 px-3 py-2 text-[14px] text-link sm:col-span-2">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="rounded-lg border border-border bg-surface px-3 py-2 text-[14px] text-foreground sm:col-span-2">
          Message envoyé.
        </p>
      )}

      <button
        type="submit"
        disabled={pending || option.targets.length === 0}
        className="rounded-full bg-accent px-6 py-3 text-[15px] font-medium text-on-accent transition hover:bg-[#1b2221] disabled:opacity-60 sm:col-span-2 sm:w-fit"
      >
        {pending ? "Envoi…" : "Envoyer le message"}
      </button>
    </form>
  );
}
