import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createMinistryClient } from "@/lib/supabase/server";
import type { IdentityResult } from "@/lib/identity/dashboard";

const OFFICIAL_MAPP_SUPABASE_URL = "https://zzfmkpfwiknekkssxaki.supabase.co";
const OFFICIAL_MAPP_PUBLISHABLE_KEY = "sb_publishable_z23F5gybMlDroslzVskaVw_a-tUVwnL";

type RankingRow = {
  context: string;
  primary_code: string | null;
  secondary_code: string | null;
  tie_break_required: boolean | null;
};

type RevisionRow = {
  id: string;
  revision: number;
  result_rankings: RankingRow[] | null;
};

type AttemptRow = {
  id: string;
  completed_at: string | null;
  result_revisions: RevisionRow[] | null;
};

/**
 * Reads the official MAPP project with the current Ministry JWT.
 * RLS in the MAPP project resolves the JWT issuer + subject against
 * participant_auth_identities, so only this Ministry account's attempts
 * can be returned. No service-role key is used here.
 */
export async function getOfficialMappIdentityResults(): Promise<IdentityResult[]> {
  const ministry = await createMinistryClient();
  const { data: userData } = await ministry.auth.getUser();
  if (!userData.user) return [];

  const { data: sessionData } = await ministry.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return [];

  const mapp = createSupabaseClient(
    OFFICIAL_MAPP_SUPABASE_URL,
    OFFICIAL_MAPP_PUBLISHABLE_KEY,
    {
      accessToken: async () => accessToken,
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  );

  const { data, error } = await mapp
    .from("attempts")
    .select("id,completed_at,result_revisions(id,revision,result_rankings(context,primary_code,secondary_code,tie_break_required))")
    .eq("status", "completed")
    .is("deleted_at", null)
    .order("completed_at", { ascending: false });

  if (error) throw new Error(`Chargement des résultats MAPP officiels impossible : ${error.message}`);

  return ((data ?? []) as AttemptRow[]).flatMap((attempt) => {
    const revision = [...(attempt.result_revisions ?? [])]
      .sort((left, right) => right.revision - left.revision)[0];
    if (!revision || !attempt.completed_at) return [];

    const ranking = (revision.result_rankings ?? []).find((row) => row.context === "natural");
    return [{
      kind: "mapp" as const,
      attemptId: attempt.id,
      resultRevisionId: revision.id,
      completedAt: attempt.completed_at,
      primaryCode: ranking?.primary_code ?? null,
      secondaryCode: ranking?.secondary_code ?? null,
      tieBreakRequired: ranking?.tie_break_required ?? false,
    }];
  });
}
