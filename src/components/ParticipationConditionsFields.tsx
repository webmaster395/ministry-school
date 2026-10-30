"use client";

import { useState } from "react";

type Audience = "all" | "specific";

export default function ParticipationConditionsFields({
  initialAudience = "all",
  initialAudienceDetails = "",
  initialPrerequisitesRequired = false,
}: {
  initialAudience?: Audience;
  initialAudienceDetails?: string | null;
  initialPrerequisitesRequired?: boolean;
}) {
  const [audience, setAudience] = useState<Audience>(initialAudience);

  return <fieldset className="rounded-2xl border border-border bg-surface/45 p-4 sm:p-5">
    <legend className="px-1 font-title text-[20px] text-foreground">Conditions de participation *</legend>
    <p className="mt-1 text-sm leading-6 text-muted">Précisez à qui s’adresse cette initiative et si les prérequis renseignés sont nécessaires.</p>

    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      <label className="cursor-pointer">
        <input required type="radio" name="participation_audience" value="all" checked={audience === "all"} onChange={() => setAudience("all")} className="peer sr-only" />
        <span className="flex min-h-12 items-center rounded-xl border border-border bg-background px-4 text-sm font-semibold transition peer-checked:border-accent peer-checked:bg-accent peer-checked:text-on-accent">Ouvert à tous</span>
      </label>
      <label className="cursor-pointer">
        <input required type="radio" name="participation_audience" value="specific" checked={audience === "specific"} onChange={() => setAudience("specific")} className="peer sr-only" />
        <span className="flex min-h-12 items-center rounded-xl border border-border bg-background px-4 text-sm font-semibold transition peer-checked:border-accent peer-checked:bg-accent peer-checked:text-on-accent">Réservé à un public spécifique</span>
      </label>
    </div>

    {audience === "specific" && <label className="mt-4 block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">À qui s’adresse ce projet ou cette formation ? *</span>
      <input name="participation_audience_details" required defaultValue={initialAudienceDetails ?? ""} placeholder="Ex. Réservé aux équipiers du pôle accueil" className="min-h-12 w-full rounded-xl border border-border bg-background px-3 text-[15px] text-foreground outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/10" />
    </label>}

    <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background px-4 py-3.5">
      <input type="checkbox" name="participation_prerequisites_required" defaultChecked={initialPrerequisitesRequired} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--accent)]" />
      <span><strong className="block text-sm">Prérequis nécessaires</strong><small className="mt-1 block leading-5 text-muted">La liste de prérequis renseignée plus haut sera présentée comme obligatoire aux participants.</small></span>
    </label>
  </fieldset>;
}
