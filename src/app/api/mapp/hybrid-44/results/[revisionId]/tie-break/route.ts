import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { applyHybridTieBreak, dimensions, type HybridDimension, type HybridScores } from "@/lib/mapp/hybrid44";
import { guestOwnsAttempt } from "@/lib/mapp/guest";

const version = "profile-descriptions-v1.0.0";
const question = "Parmi ces descriptions, laquelle te correspond le mieux ?";
const descriptions: Record<HybridDimension, string> = {
  D: "J’aime avoir de l’autonomie, relever des défis et obtenir des résultats.",
  I: "J’aime créer du lien, partager mon enthousiasme et entraîner les autres.",
  S: "J’aime la stabilité, la continuité et les relations de confiance.",
  C: "J’aime comprendre en profondeur, être précis et faire les choses avec méthode.",
};

async function authorize(revisionId: string) {
  const admin = createServiceClient().schema("mapp");
  const { data: revision } = await admin.from("result_revisions").select("attempt_id").eq("id", revisionId).single();
  if (!revision) return false;
  if (await guestOwnsAttempt(revision.attempt_id)) return true;
  const user = await createClient();
  const { data } = await user.rpc("mapp_hybrid_attempt_access", { p_attempt_id: revision.attempt_id });
  return Boolean(data?.allowed);
}

async function pending(revisionId: string) {
  const admin = createServiceClient().schema("mapp");
  const { data: rankings, error } = await admin.from("result_rankings").select("id,context,basis,initial_order,primary_candidates,secondary_candidates,resolved_order,is_indeterminate").eq("result_revision_id", revisionId).order("context");
  if (error) throw error;
  for (const ranking of rankings ?? []) {
    if (ranking.is_indeterminate || ranking.resolved_order) continue;
    const primary = ranking.primary_candidates as HybridDimension[];
    const secondary = ranking.secondary_candidates as HybridDimension[];
    const rankScope = primary.length > 1 ? "primary" : "secondary";
    const candidates = rankScope === "primary" ? primary : secondary;
    if (candidates.length < 2) continue;
    let { data: run } = await admin.from("result_tie_break_runs").select("id,status").eq("result_ranking_id", ranking.id).eq("rank_scope", rankScope).maybeSingle();
    if (!run) {
      const inserted = await admin.from("result_tie_break_runs").insert({ result_ranking_id: ranking.id, version, context: ranking.context, rank_scope: rankScope, candidate_codes: candidates, initial_order: dimensions.filter((code) => candidates.includes(code)) }).select("id,status").single();
      if (inserted.error) throw inserted.error;
      run = inserted.data;
    }
    if (run.status === "completed") continue;
    const { data: rows, error: answerError } = await admin.from("result_profile_choice_answers").select("sequence,selected_code").eq("run_id", run.id).order("sequence");
    if (answerError) throw answerError;
    const selected = (rows ?? []).map((row) => row.selected_code as HybridDimension);
    const needsSecond = rankScope === "primary" && candidates.length >= 3;
    if (!selected.length) return { done: false as const, runId: run.id, context: ranking.context, rankScope, sequence: 1, candidates, question, options: candidates.map((dimension) => ({ dimension, text: descriptions[dimension] })) };
    if (needsSecond && selected.length === 1) {
      const remaining = candidates.filter((code) => code !== selected[0]);
      return { done: false as const, runId: run.id, context: ranking.context, rankScope, sequence: 2, candidates: remaining, question, options: remaining.map((dimension) => ({ dimension, text: descriptions[dimension] })) };
    }
    const applied = applyHybridTieBreak(ranking.basis as HybridScores, selected);
    const unaffected = (ranking.initial_order as HybridDimension[]).filter((code) => !candidates.includes(code));
    const resolved = rankScope === "primary"
      ? [...selected, ...candidates.filter((code) => !selected.includes(code)).sort((a, b) => applied.postScores[b] - applied.postScores[a]), ...unaffected]
      : [unaffected[0], selected[0], ...candidates.filter((code) => code !== selected[0]), ...unaffected.slice(1)];
    const { data: dimensionRows, error: dimensionError } = await admin.from("dimensions").select("id,code").in("code", ["conquerant", "communiquant", "facilitateur", "analyste"]);
    if (dimensionError) throw dimensionError;
    const dimensionIds = new Map((dimensionRows ?? []).map((row) => [row.code, row.id]));
    const names = { D: "conquerant", I: "communiquant", S: "facilitateur", C: "analyste" } as const;
    await Promise.all(dimensions.flatMap((code) => [
      admin.from("result_dimension_metrics").update({ post_tie_break_score: applied.postScores[code], vote_count: applied.postScores[code], display_percentage: applied.percentages?.[code] }).eq("result_revision_id", revisionId).eq("context", ranking.context).eq("dimension_code", code),
      admin.from("result_dimension_scores").update({ raw_score: applied.postScores[code], percentage: applied.percentages?.[code] }).eq("result_revision_id", revisionId).eq("context", ranking.context).eq("dimension_id", dimensionIds.get(names[code])!),
    ]));
    await admin.from("result_tie_break_runs").update({ status: "completed", final_order: resolved, resolution_state: "unique", completed_at: new Date().toISOString() }).eq("id", run.id);
    await admin.from("result_rankings").update({ basis: applied.postScores, resolved_order: resolved, primary_code: resolved[0], secondary_code: resolved[1] }).eq("id", ranking.id);
  }
  return { done: true as const };
}

export async function GET(_: Request, { params }: { params: Promise<{ revisionId: string }> }) {
  const { revisionId } = await params;
  if (!await authorize(revisionId)) return Response.json({ error: "Résultat indisponible." }, { status: 404 });
  try { return Response.json(await pending(revisionId)); }
  catch (cause) { return Response.json({ error: cause instanceof Error ? cause.message : "Départage indisponible." }, { status: 500 }); }
}

export async function POST(request: Request, { params }: { params: Promise<{ revisionId: string }> }) {
  const { revisionId } = await params;
  if (!await authorize(revisionId)) return Response.json({ error: "Résultat indisponible." }, { status: 404 });
  const current = await pending(revisionId);
  if (current.done) return Response.json(current);
  const body = await request.json() as { selectedCode?: HybridDimension };
  if (!body.selectedCode || !current.candidates.includes(body.selectedCode)) return Response.json({ error: "Réponse invalide." }, { status: 400 });
  const admin = createServiceClient().schema("mapp");
  const { error } = await admin.from("result_profile_choice_answers").insert({ run_id: current.runId, sequence: current.sequence, candidate_codes: current.candidates, selected_code: body.selectedCode, question_version: version });
  if (error && error.code !== "23505") return Response.json({ error: "Réponse non enregistrée." }, { status: 500 });
  return Response.json(await pending(revisionId));
}
