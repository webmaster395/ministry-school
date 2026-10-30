import type { ComponentProps } from "react";
import { ClipboardPenLine } from "lucide-react";
import OpportunityEditForms from "@/components/OpportunityEditForms";

type Props = Omit<ComponentProps<typeof OpportunityEditForms>, "experience" | "canManageInternalMaterial"> & {
  roleLabel: "Responsable" | "Contributeur";
  readOnly: boolean;
};

/** Espace de préparation personnel : volontairement distinct de la fiche de supervision Admin. */
export default function OpportunityOperationalWorkspace({ roleLabel, readOnly, ...props }: Props) {
  return <div className="space-y-5">
    <section className="flex min-w-0 flex-wrap items-start gap-3 rounded-2xl border border-border bg-background px-4 py-4 sm:px-5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-muted"><ClipboardPenLine size={19} /></span>
      <div className="min-w-0 flex-1 basis-56"><p className="label text-[10px] tracking-[.14em] text-muted sm:text-xs">ESPACE OPÉRATIONNEL · {roleLabel.toUpperCase()}</p><h1 className="font-title mt-1 break-words text-[clamp(1.35rem,6vw,1.75rem)] leading-tight">{props.opportunity.title}</h1><p className="mt-1 text-sm leading-relaxed text-muted">{readOnly ? "Consultation en lecture seule." : "Préparez la fiche et enregistrez votre travail au fil de l’eau. La publication reste décidée dans Admin."}</p></div>
    </section>
    <OpportunityEditForms {...props} canManageInternalMaterial={false} experience={readOnly ? "supervision" : "workspace"} />
  </div>;
}
