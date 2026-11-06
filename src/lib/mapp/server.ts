import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { MappQuestionnaireContext, MappResultBundle } from "./types";

export async function openMappQuestionnaire() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mapp_open_questionnaire");
  if (error) throw new Error(`Ouverture de Profil MAPP impossible : ${error.message}`);
  return data as MappQuestionnaireContext;
}

export async function getMappResultBundle(attemptId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mapp_get_results", {
    p_attempt_id: attemptId,
  });
  if (error) throw new Error(`Résultat Profil MAPP indisponible : ${error.message}`);
  return data as MappResultBundle;
}
