import type { Opportunity } from "@/lib/data/opportunities";
import { isPublished } from "@/lib/data/opportunities";
import type { OpportunityReviewState } from "@/lib/data/opportunity-review";

export type OpportunityWorkflowKey = "draft" | "pending" | "corrections" | "scheduled" | "published" | "past" | "archived";
export type OpportunityWorkflowContext = "workspace" | "supervision";

export type OpportunityWorkflowDisplay = {
  key: OpportunityWorkflowKey;
  label: string;
  badgeClass: string;
  actionLabel: string | null;
};

const STATUS_STYLE: Record<OpportunityWorkflowKey, string> = {
  draft: "bg-surface text-foreground",
  pending: "bg-[#FFF0CC] text-[#78520A]",
  corrections: "bg-rose-100 text-rose-800",
  scheduled: "bg-blue-100 text-blue-800",
  published: "bg-emerald-100 text-emerald-800",
  past: "bg-surface text-muted",
  archived: "bg-surface text-muted",
};

const STATUS_LABEL: Record<OpportunityWorkflowContext, Record<OpportunityWorkflowKey, Pick<OpportunityWorkflowDisplay, "label" | "actionLabel">>> = {
  workspace: {
    draft: { label: "Brouillon", actionLabel: null },
    pending: { label: "En attente de validation", actionLabel: "Voir le suivi" },
    corrections: { label: "Corrections à apporter", actionLabel: "Voir les corrections" },
    scheduled: { label: "Publication programmée", actionLabel: "Voir la programmation" },
    published: { label: "Publié", actionLabel: null },
    past: { label: "Passé", actionLabel: null },
    archived: { label: "Archivé", actionLabel: null },
  },
  supervision: {
    draft: { label: "Brouillon", actionLabel: null },
    pending: { label: "À valider", actionLabel: "Examiner la demande" },
    corrections: { label: "Corrections demandées", actionLabel: "Voir les corrections" },
    scheduled: { label: "Publication programmée", actionLabel: "Voir la programmation" },
    published: { label: "Publié", actionLabel: null },
    past: { label: "Passé", actionLabel: null },
    archived: { label: "Archivé", actionLabel: null },
  },
};

export function parisToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

export function opportunityWorkflow(
  opportunity: Pick<Opportunity, "publication_status" | "published_at" | "archived_at">,
  dates: { session_date: string }[],
  review: Pick<OpportunityReviewState, "status">,
  context: OpportunityWorkflowContext = "workspace",
  now = new Date(),
): OpportunityWorkflowDisplay {
  let key: OpportunityWorkflowKey;
  if (opportunity.publication_status === "archived" || opportunity.archived_at) key = "archived";
  else if (review.status === "pending") key = "pending";
  else if (review.status === "changes_requested") key = "corrections";
  else if (opportunity.publication_status === "scheduled" && opportunity.published_at && new Date(opportunity.published_at) > now) key = "scheduled";
  else if (isPublished(opportunity as Opportunity, now) && dates.length > 0 && dates.every((date) => date.session_date < parisToday(now))) key = "past";
  else if (isPublished(opportunity as Opportunity, now)) key = "published";
  else key = "draft";
  return { key, badgeClass: STATUS_STYLE[key], ...STATUS_LABEL[context][key] };
}
