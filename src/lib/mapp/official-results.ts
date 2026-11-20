import "server-only";

import { cookies } from "next/headers";
import type { IdentityResult } from "@/lib/identity/dashboard";

const OFFICIAL_RESULTS_ENDPOINT = "https://profil-mapp.vercel.app/apps/profil-mapp/api/integrations/ministry/results";

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
 * Transitional read-only bridge for completed results kept in the archived
 * MAPP application. Native Ministry results always take precedence.
 */
export async function getOfficialMappIdentityResults(): Promise<IdentityResult[]> {
  const cookieHeader = (await cookies()).getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
  if (!cookieHeader) return [];
  const response = await fetch(OFFICIAL_RESULTS_ENDPOINT, {
    method: "POST",
    headers: { cookie: cookieHeader, accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return [];
  const payload = await response.json() as { results?: AttemptRow[] };

  return (payload.results ?? []).flatMap((attempt) => {
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
