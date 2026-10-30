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
    <section className="flex flex-wrap items-start gap-3 rounded-2xl border border-border bg-background px-5 py-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-muted"><ClipboardPenLine size={19} /></span>
      <div className="min-w-0 flex-1"><p className="label text-xs tracking-[.14em] text-muted">ESPACE OPÉRATIONNEL · {roleLabel.toUpperCase()}</p><h1 className="font-title mt-1 text-[24px]">Préparer cette initiative</h1><p className="mt-1 text-sm leading-relaxed text-muted">{readOnly ? "Vous consultez cette fiche en lecture seule. Le responsable peut vous accorder l’écriture." : "Enregistrez votre travail au fil de l’eau. La publication reste exclusivement décidée dans la vue Admin."}</p></div>
    </section>
    <OpportunityEditForms {...props} canManageInternalMaterial={false} experience={readOnly ? "supervision" : "workspace"} />
  </div>;
}
