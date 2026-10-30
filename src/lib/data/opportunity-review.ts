import type { SupabaseClient } from "@supabase/supabase-js";

export type OpportunityReviewState = {
  status: "none" | "pending" | "changes_requested" | "approved" | "cancelled";
  desiredPublicationStatus: "published" | "scheduled" | null;
  desiredPublishedAt: string | null;
  requestedAt: string | null;
  correctionMessage: string | null;
  requestedByName: string | null;
  decidedAt: string | null;
  decidedByName: string | null;
  canDecide: boolean;
  isObserver: boolean;
  hasDraftRevision: boolean;
  history: OpportunityReviewHistory[];
};

export type OpportunityReviewHistory = {
  id: string;
  decision: "approved" | "changes_requested";
  message: string | null;
  publishMode: "now" | "scheduled" | null;
  publishAt: string | null;
  requestedAt: string;
  decidedAt: string;
  requestedByName: string | null;
  decidedByName: string | null;
};

const EMPTY_REVIEW: OpportunityReviewState = {
  status: "none",
  desiredPublicationStatus: null,
  desiredPublishedAt: null,
  requestedAt: null,
  correctionMessage: null,
  requestedByName: null,
  decidedAt: null,
  decidedByName: null,
  canDecide: false,
  isObserver: false,
  hasDraftRevision: false,
  history: [],
};

export async function getOpportunityReviewState(supabase: SupabaseClient, opportunityId: string) {
  const { data, error } = await supabase.rpc("opportunity_review_state", { p_opportunity: opportunityId });
  if (error || !data) return EMPTY_REVIEW;
  return { ...EMPTY_REVIEW, ...(data as Partial<OpportunityReviewState>) };
}
