"use client";

import type { ComponentProps } from "react";
import { useState } from "react";
import { ClipboardPenLine } from "lucide-react";
import OpportunityEditForms from "@/components/OpportunityEditForms";
import { opportunityType } from "@/lib/data/opportunities";
import type { OpportunityWorkflowDisplay, OpportunityWorkflowKey } from "@/lib/opportunity-workflow";

type Props = Omit<ComponentProps<typeof OpportunityEditForms>, "experience" | "canManageInternalMaterial"> & {
  roleLabel: "Responsable" | "Contributeur";
  readOnly: boolean;
  workflow: OpportunityWorkflowDisplay;
};

type OpportunityType = ReturnType<typeof opportunityType>;

const objectLabel: Record<OpportunityType, string> = {
  projet: "ce projet",
  formation: "cette formation",
  both: "ce projet et cette formation",
};

const statusCopy: Record<OpportunityType, Record<OpportunityWorkflowKey, string>> = {
  projet: {
    draft: "Ce projet est en cours de préparation.",
    pending: "Ce projet est en attente de validation.",
    corrections: "Ce projet nécessite des corrections.",
    scheduled: "La publication de ce projet est programmée.",
    published: "Ce projet est en cours de réalisation.",
    past: "Ce projet est terminé.",
    archived: "Ce projet a été archivé.",
  },
  formation: {
    draft: "Cette formation est en cours de préparation.",
    pending: "Cette formation est en attente de validation.",
    corrections: "Cette formation nécessite des corrections.",
    scheduled: "La publication de cette formation est programmée.",
    published: "Cette formation est en cours de réalisation.",
    past: "Cette formation est terminée.",
    archived: "Cette formation a été archivée.",
  },
  both: {
    draft: "Ce projet et cette formation sont en cours de préparation.",
    pending: "Ce projet et cette formation sont en attente de validation.",
    corrections: "Ce projet et cette formation nécessitent des corrections.",
    scheduled: "La publication de ce projet et de cette formation est programmée.",
    published: "Ce projet et cette formation sont en cours de réalisation.",
    past: "Ce projet et cette formation sont terminés.",
    archived: "Ce projet et cette formation ont été archivés.",
  },
};

/** Espace de préparation personnel : volontairement distinct de la fiche de supervision Admin. */
export default function OpportunityOperationalWorkspace({ roleLabel, readOnly, workflow, ...props }: Props) {
  const [type, setType] = useState<OpportunityType>(opportunityType(props.opportunity));
  const terminal = workflow.key === "past" || workflow.key === "archived";
  const action = readOnly || terminal ? "Consulter" : "Préparer";
  return <div className="space-y-5">
    <section className="flex min-w-0 flex-wrap items-start gap-3 rounded-2xl border border-border bg-background px-4 py-4 sm:px-5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-muted"><ClipboardPenLine size={19} /></span>
      <div className="min-w-0 flex-1 basis-56"><p className="label text-[10px] tracking-[.14em] text-muted sm:text-xs">ESPACE PROJETS ET FORMATIONS · {roleLabel.toUpperCase()}</p><h1 className="font-title mt-1 break-words text-[clamp(1.35rem,6vw,1.75rem)] leading-tight">{action} {objectLabel[type]}</h1><p className="mt-1 text-sm leading-relaxed text-muted">{statusCopy[type][workflow.key]}</p></div>
    </section>
    <OpportunityEditForms {...props} canManageInternalMaterial={false} experience={readOnly ? "supervision" : "workspace"} onTypeChange={setType} />
  </div>;
}
