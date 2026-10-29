import type { SupabaseClient } from "@supabase/supabase-js";

export type OpportunityReviewState = {
  status: "none" | "pending" | "changes_requested" | "approved" | "cancelled";
  desiredPublicationStatus: "published" | "scheduled" | null;
  desiredPublishedAt: string | null;
  requestedAt: string | null;
  correctionMessage: string | null;
  nathalieApproved: boolean;
  floraApproved: boolean;
  canDecide: boolean;
  isObserver: boolean;
};

const EMPTY_REVIEW: OpportunityReviewState = {
  status: "none",
  desiredPublicationStatus: null,
  desiredPublishedAt: null,
  requestedAt: null,
  correctionMessage: null,
  nathalieApproved: false,
  floraApproved: false,
  canDecide: false,
  isObserver: false,
};

export async function getOpportunityReviewState(supabase: SupabaseClient, opportunityId: string) {
  const { data, error } = await supabase.rpc("opportunity_review_state", { p_opportunity: opportunityId });
  if (error || !data) return EMPTY_REVIEW;
  return { ...EMPTY_REVIEW, ...(data as Partial<OpportunityReviewState>) };
}
