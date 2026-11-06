import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getGuestCredential, sha256 } from "@/lib/mapp/guest";

export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const body = await request.json();
  const guest = await getGuestCredential(attemptId);
  if (body.kind === "step") {
    let allowed = false;
    if (guest) {
      const { data } = await createServiceClient().schema("mapp").rpc("guest_access_allowed", { p_attempt_id: attemptId, p_token_hash: sha256(guest.secret) });
      allowed = data === true;
    } else {
      const user = await createClient();
      const { data } = await user.rpc("mapp_hybrid_attempt_access", { p_attempt_id: attemptId });
      allowed = data?.allowed === true && data?.status === "in_progress";
    }
    if (!allowed) return Response.json({ error: "Sauvegarde refusée." }, { status: 403 });
    const { data, error } = await createServiceClient().schema("mapp").rpc("save_hybrid_step", {
      p_attempt_id: attemptId, p_mutation_id: body.mutationId, p_expected_revision: body.expectedRevision,
      p_client_sequence: body.clientSequence, p_scale_answers: body.scaleAnswers, p_duel_answers: body.duelAnswers,
    });
    if (error) return Response.json({ error: "Conflit de sauvegarde." }, { status: 409 });
    return Response.json(data);
  }
  if (guest) {
    const db = createServiceClient().schema("mapp");
    const args = body.kind === "duel"
      ? { p_attempt_id: attemptId, p_token_hash: sha256(guest.secret), p_question_id: body.questionId, p_option_id: body.optionId, p_client_sequence: body.clientSequence }
      : { p_attempt_id: attemptId, p_token_hash: sha256(guest.secret), p_mutation_id: body.mutationId, p_expected_revision: body.expectedRevision, p_client_sequence: body.clientSequence, p_answers: body.answers };
    const { data, error } = await db.rpc(body.kind === "duel" ? "save_guest_duel_answer" : "save_guest_answer_batch", args);
    if (error) return Response.json({ error: "Sauvegarde refusée." }, { status: 409 });
    return Response.json(data ?? { saved: true });
  }
  const user = await createClient();
  const { data, error } = body.kind === "duel"
    ? await user.rpc("mapp_save_duel_answer", { p_attempt_id: attemptId, p_question_id: body.questionId, p_option_id: body.optionId, p_client_sequence: body.clientSequence })
    : await user.rpc("mapp_save_answer_batch", { p_attempt_id: attemptId, p_mutation_id: body.mutationId, p_expected_revision: body.expectedRevision, p_client_sequence: body.clientSequence, p_answers: body.answers });
  if (error) return Response.json({ error: "Sauvegarde refusée." }, { status: 409 });
  return Response.json(data ?? { saved: true });
}
