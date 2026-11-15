import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getGuestCredential, sha256 } from "@/lib/mapp/guest";

type TieAnswer = { questionId: string; selectedCode: string };

export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const body = await request.json().catch(() => null) as { resultRevisionId?: string; answers?: TieAnswer[] } | null;
  if (!body?.resultRevisionId || !Array.isArray(body.answers) || body.answers.length !== 3) {
    return Response.json({ error: "Les trois réponses de départage sont requises." }, { status: 400 });
  }

  const guest = await getGuestCredential(attemptId);
  if (guest) {
    const { data, error } = await createServiceClient().schema("mapp").rpc("submit_invited_guest_tie_break", {
      p_attempt_id: attemptId,
      p_token_hash: sha256(guest.secret),
      p_result_revision_id: body.resultRevisionId,
      p_answers: body.answers,
    });
    if (error) return Response.json({ error: "Le départage n’a pas pu être enregistré." }, { status: 400 });
    return Response.json(data);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mapp_submit_tie_break", {
    p_attempt_id: attemptId,
    p_result_revision_id: body.resultRevisionId,
    p_answers: body.answers,
  });
  if (error) return Response.json({ error: "Le départage n’a pas pu être enregistré." }, { status: 400 });
  return Response.json(data);
}
