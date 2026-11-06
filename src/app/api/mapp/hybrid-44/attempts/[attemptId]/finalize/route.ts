import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { HYBRID_44_VERSION, scoreHybrid44 } from "@/lib/mapp/hybrid44";
import { getGuestCredential, sha256 } from "@/lib/mapp/guest";

type RelatedQuestion =
  | { metadata?: { source_id?: string } }
  | Array<{ metadata?: { source_id?: string } }>
  | null;
type GuestFinalizeInput = {
  status: "in_progress" | "completed";
  revisionId: string | null;
  duelAnswers: Record<string, string>;
  scaleAnswers: Record<string, number>;
};

export async function POST(
  _: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const { attemptId } = await params;
  const guestCredential = await getGuestCredential(attemptId);
  const admin = createServiceClient().schema("mapp");
  let duelAnswers: Record<string, string>;
  let scaleAnswers: Record<string, number>;

  if (guestCredential) {
    const { data, error } = await admin.rpc("guest_hybrid_finalize_input", {
      p_attempt_id: attemptId,
      p_token_hash: sha256(guestCredential.secret),
    });
    if (error || !data) {
      return Response.json(
        { error: "Tentative indisponible." },
        { status: 404 },
      );
    }
    const input = data as GuestFinalizeInput;
    if (input.status === "completed") return Response.json({ revisionId: input.revisionId });
    duelAnswers = input.duelAnswers;
    scaleAnswers = input.scaleAnswers;
  } else {
    const userDb = await createClient();
    const { data: access, error: accessError } = await userDb.rpc(
      "mapp_hybrid_attempt_access",
      { p_attempt_id: attemptId },
    );
    if (accessError || !access?.allowed) {
      return Response.json(
        { error: "Tentative indisponible." },
        { status: 404 },
      );
    }
    if (access.status === "completed") {
      return Response.json({ revisionId: access.revisionId });
    }

    const [
      { data: duelRows, error: duelError },
      { data: scaleRows, error: scaleError },
    ] = await Promise.all([
      admin
        .from("attempt_duel_answers")
        .select("selected_option_id,questions(metadata)")
        .eq("attempt_id", attemptId),
      admin
        .from("attempt_answers")
        .select("answer_value,questions(metadata)")
        .eq("attempt_id", attemptId),
    ]);
    if (duelError || scaleError) {
      return Response.json(
        { error: "Les réponses ne peuvent pas être relues." },
        { status: 500 },
      );
    }
    const optionIds = (duelRows ?? []).map((row) => row.selected_option_id);
    const { data: options, error: optionError } = await admin
      .from("question_options")
      .select("id,option_key")
      .in("id", optionIds);
    if (optionError) {
      return Response.json(
        { error: "Les options sont indisponibles." },
        { status: 500 },
      );
    }
    const keys = new Map(
      (options ?? []).map((option) => [option.id, option.option_key]),
    );
    const sourceId = (related: RelatedQuestion) => {
      const question = Array.isArray(related) ? related[0] : related;
      return String(question?.metadata?.source_id ?? "");
    };
    duelAnswers = Object.fromEntries(
      (duelRows ?? []).map((row) => [
        sourceId(row.questions as RelatedQuestion),
        String(keys.get(row.selected_option_id) ?? ""),
      ]),
    );
    scaleAnswers = Object.fromEntries(
      (scaleRows ?? []).map((row) => [
        sourceId(row.questions as RelatedQuestion),
        Number(row.answer_value),
      ]),
    );
  }

  try {
    const scored = scoreHybrid44(duelAnswers, scaleAnswers);
    const payload = {
      questionnaireVersion: HYBRID_44_VERSION,
      scoringVersion: HYBRID_44_VERSION,
      ...scored,
    };
    const { data: revisionId, error } = await admin.rpc(
      "finalize_hybrid_44_attempt",
      { target_attempt: attemptId, result_payload: payload },
    );
    if (error) throw error;
    return Response.json({ revisionId });
  } catch (cause) {
    return Response.json(
      { error: cause instanceof Error ? cause.message : "Calcul impossible." },
      { status: 422 },
    );
  }
}

