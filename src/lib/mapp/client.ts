import { createClient } from "@/lib/supabase/client";
import type {
  MappAnswerMutation,
  MappQuestionnaireContext,
  MappResultBundle,
  MappSaveAcknowledgement,
} from "./types";

function rpcError(operation: string, message: string) {
  return new Error(`${operation}: ${message}`);
}

export async function openMappQuestionnaire() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("mapp_open_questionnaire");
  if (error) throw rpcError("Ouverture de Profil MAPP impossible", error.message);
  return data as MappQuestionnaireContext;
}

export async function saveMappAnswerBatch(mutation: MappAnswerMutation) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("mapp_save_answer_batch", {
    p_attempt_id: mutation.attemptId,
    p_mutation_id: mutation.mutationId,
    p_expected_revision: mutation.expectedRevision,
    p_client_sequence: mutation.clientSequence,
    p_answers: mutation.answers,
  });
  if (error) throw rpcError("Sauvegarde Profil MAPP impossible", error.message);
  return data as MappSaveAcknowledgement;
}

export async function getMappResultBundle(attemptId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("mapp_get_results", {
    p_attempt_id: attemptId,
  });
  if (error) throw rpcError("Résultat Profil MAPP indisponible", error.message);
  return data as MappResultBundle;
}

export async function finalizeMappAttempt(attemptId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("mapp_finalize_attempt", {
    p_attempt_id: attemptId,
  });
  if (error) throw rpcError("Finalisation Profil MAPP impossible", error.message);
  return data as { resultRevisionId: string; bundle: MappResultBundle };
}

export async function submitMappTieBreak(
  attemptId: string,
  resultRevisionId: string,
  answers: Array<{ questionId: string; selectedCode: string }>,
) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("mapp_submit_tie_break", {
    p_attempt_id: attemptId,
    p_result_revision_id: resultRevisionId,
    p_answers: answers,
  });
  if (error) throw rpcError("Départage Profil MAPP impossible", error.message);
  return data as MappResultBundle;
}
