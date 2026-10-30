"use client";

import type { ComponentProps } from "react";
import OpportunityEditForms from "@/components/OpportunityEditForms";
import type { OpportunityWorkflowDisplay } from "@/lib/opportunity-workflow";

type Props = Omit<ComponentProps<typeof OpportunityEditForms>, "experience" | "canManageInternalMaterial"> & {
  roleLabel: "Responsable" | "Contributeur";
  readOnly: boolean;
  workflow: OpportunityWorkflowDisplay;
};

/** Espace de préparation personnel : volontairement distinct de la fiche de supervision Admin. */
export default function OpportunityOperationalWorkspace({ roleLabel, readOnly, workflow, ...props }: Props) {
  return <OpportunityEditForms
    {...props}
    canManageInternalMaterial={false}
    experience="workspace"
    workspaceHeader={{ roleLabel, readOnly, workflow, canSubmit: props.canManage }}
  />;
}
