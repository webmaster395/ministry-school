import type { SupabaseClient } from "@supabase/supabase-js";

export type CourseAnnotation = {
  id: string;
  body: string;
  requiresAction: boolean;
  resolvedAt: string | null;
  createdAt: string;
  authorName: string;
};

export type MinistryCourseReviewState = {
  status: "draft" | "pending" | "changes_requested" | "scheduled" | "published" | "superseded";
  publicationAt: string | null;
  submittedAt: string | null;
  canSubmit: boolean;
  canDecide: boolean;
  annotations: CourseAnnotation[];
};

const EMPTY: MinistryCourseReviewState = {
  status: "draft",
  publicationAt: null,
  submittedAt: null,
  canSubmit: false,
  canDecide: false,
  annotations: [],
};

export async function getMinistryCourseReviewState(supabase: SupabaseClient, sessionId: string) {
  const { data, error } = await supabase.rpc("ministry_course_review_state", { p_session: sessionId });
  if (error || !data) return EMPTY;
  return { ...EMPTY, ...(data as Partial<MinistryCourseReviewState>) };
}

export type ValidationQueueItem = {
  id: string;
  title: string;
  submittedAt: string;
  responsible: string;
  status: string;
  ministry?: string;
  ministrySlug?: string;
  contentType: "project" | "training" | "both" | "course";
  decidedAt?: string | null;
  reviewer?: string | null;
};

export async function getValidationQueue(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("validation_queue");
  if (error || !data) return { opportunities: [], courses: [], history: [] } as {
    opportunities: ValidationQueueItem[];
    courses: ValidationQueueItem[];
    history: ValidationQueueItem[];
  };
  return data as unknown as {
    opportunities: ValidationQueueItem[];
    courses: ValidationQueueItem[];
    history: ValidationQueueItem[];
  };
}
