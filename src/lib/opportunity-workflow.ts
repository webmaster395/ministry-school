import type { Opportunity } from "@/lib/data/opportunities";
import { isPublished } from "@/lib/data/opportunities";
import type { OpportunityReviewState } from "@/lib/data/opportunity-review";

export type OpportunityWorkflowKey = "draft" | "pending" | "corrections" | "scheduled" | "published" | "past" | "archived";

export type OpportunityWorkflowDisplay = {
  key: OpportunityWorkflowKey;
  label: string;
  badgeClass: string;
  actionLabel: string | null;
};

const STATUS: Record<OpportunityWorkflowKey, Omit<OpportunityWorkflowDisplay, "key">> = {
  draft: { label: "Brouillon", badgeClass: "bg-surface text-foreground", actionLabel: null },
  pending: { label: "À valider", badgeClass: "bg-[#FFF0CC] text-[#78520A]", actionLabel: "À valider" },
  corrections: { label: "Corrections en attente", badgeClass: "bg-rose-100 text-rose-800", actionLabel: "Voir les corrections" },
  scheduled: { label: "Publication programmée", badgeClass: "bg-blue-100 text-blue-800", actionLabel: "Voir la programmation" },
  published: { label: "Publié", badgeClass: "bg-emerald-100 text-emerald-800", actionLabel: null },
  past: { label: "Passé", badgeClass: "bg-surface text-muted", actionLabel: null },
  archived: { label: "Archivé", badgeClass: "bg-surface text-muted", actionLabel: null },
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
  return { key, ...STATUS[key] };
}
