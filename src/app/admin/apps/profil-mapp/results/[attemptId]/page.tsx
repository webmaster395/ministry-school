import { notFound } from "next/navigation";
import { getViewer } from "@/lib/data/viewer";
import { createServiceClient } from "@/lib/supabase/service";
import type { MappResultBundle } from "@/lib/mapp/types";
import AdminMappResult from "./AdminMappResult";

export const dynamic = "force-dynamic";

export default async function AdminMappResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const viewer = await getViewer();
  if (!viewer?.roles.superAdmin) notFound();
  const { attemptId } = await params;
  const mapp = createServiceClient().schema("mapp");
  const { data: attempt } = await mapp.from("attempts").select("id,participant_id,status,completed_at").eq("id", attemptId).maybeSingle();
  if (!attempt || attempt.status !== "completed" || !attempt.completed_at) notFound();
  const [{ data: profile }, { data: revision }] = await Promise.all([
    mapp.from("participant_profiles").select("first_name,last_name").eq("participant_id", attempt.participant_id).maybeSingle(),
    mapp.from("result_revisions").select("id,revision,scoring_version_id").eq("attempt_id", attemptId).order("revision", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!revision) notFound();
  const [{ data: scoreRows }, { data: metrics }, { data: rankings }, { data: tieBreak }, { data: dimensions }] = await Promise.all([
    mapp.from("result_dimension_scores").select("context,dimension_id,raw_score,max_score,percentage").eq("result_revision_id", revision.id),
    mapp.from("result_dimension_metrics").select("*").eq("result_revision_id", revision.id),
    mapp.from("result_rankings").select("*").eq("result_revision_id", revision.id),
    mapp.from("result_tie_breaks").select("*").eq("result_revision_id", revision.id).maybeSingle(),
    mapp.from("dimensions").select("id,code,name,position"),
  ]);
  const dimensionById = new Map((dimensions ?? []).map((dimension) => [dimension.id, dimension]));
  const scores = (scoreRows ?? []).map((score) => {
    const dimension = dimensionById.get(score.dimension_id);
    return { context: score.context, dimensionCode: dimension?.code, dimensionName: dimension?.name, rawScore: score.raw_score, maxScore: score.max_score, percentage: score.percentage, position: dimension?.position };
  }).sort((left, right) => Number(left.position ?? 0) - Number(right.position ?? 0));
  const bundle: MappResultBundle = {
    attemptId,
    participantName: [profile?.first_name, profile?.last_name].filter(Boolean).join(" "),
    completedAt: attempt.completed_at,
    resultRevisionId: revision.id,
    revision: revision.revision,
    scoringVersionId: revision.scoring_version_id,
    scores,
    metrics: metrics ?? [],
    rankings: rankings ?? [],
    tieBreak: tieBreak ?? null,
  };
  return <AdminMappResult bundle={bundle} />;
}
