import { notFound } from "next/navigation";
import { getViewer } from "@/lib/data/viewer";
import { createServiceClient } from "@/lib/supabase/service";
import type { MappResultBundle } from "@/lib/mapp/types";
import AdminMappResult from "./AdminMappResult";
import AccountManagement from "./AccountManagement";

export const dynamic = "force-dynamic";

export default async function AdminMappResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const viewer = await getViewer();
  if (!viewer?.roles.superAdmin) notFound();
  const { attemptId } = await params;
  const service = createServiceClient();
  const mapp = service.schema("mapp");
  const { data: attempt } = await mapp.from("attempts").select("id,participant_id,status,completed_at").eq("id", attemptId).maybeSingle();
  if (!attempt || attempt.status !== "completed" || !attempt.completed_at) notFound();
  const [{ data: profile }, { data: revision }, { data: identity }, { data: profiles }, authUsers] = await Promise.all([
    mapp.from("participant_profiles").select("first_name,last_name,email").eq("participant_id", attempt.participant_id).maybeSingle(),
    mapp.from("result_revisions").select("id,revision,scoring_version_id").eq("attempt_id", attemptId).order("revision", { ascending: false }).limit(1).maybeSingle(),
    mapp.from("participant_auth_identities").select("auth_user_id").eq("participant_id", attempt.participant_id).is("revoked_at", null).maybeSingle(),
    service.from("profiles").select("id,full_name,deactivated,is_test_account").order("full_name"),
    service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
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
  const authById = new Map((authUsers.data.users ?? []).map((user) => [user.id, user.email ?? ""]));
  const profileById = new Map((profiles ?? []).map((item) => [item.id, item]));
  const linkedProfile = identity?.auth_user_id ? profileById.get(identity.auth_user_id) : null;
  const linkedEmail = identity?.auth_user_id ? authById.get(identity.auth_user_id) : "";
  const accounts = (profiles ?? []).filter((item) => !item.deactivated).map((item) => ({ id: item.id, label: item.full_name || "Sans nom", email: authById.get(item.id) || "E-mail indisponible" }));
  const testText = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""} ${profile?.email ?? ""} ${linkedProfile?.full_name ?? ""}`;
  const canDeleteTest = linkedProfile?.is_test_account === true || /(^|[\s._+-])test([\s._@+-]|$)/i.test(testText);
  return <>
    <AccountManagement attemptId={attemptId} participantId={attempt.participant_id} accounts={accounts} linkedLabel={identity?.auth_user_id ? `${linkedProfile?.full_name || "Compte Ministry School"} · ${linkedEmail || "e-mail indisponible"}` : null} canDeleteTest={canDeleteTest} />
    <AdminMappResult bundle={bundle} />
  </>;
}
