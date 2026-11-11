import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type AttemptRow = {
  id: string;
  participant_id: string;
  status: string;
  source: string;
  started_at: string;
  completed_at: string | null;
};

export default async function ProfilMappResultsPage() {
  const mapp = createServiceClient().schema("mapp");
  const { data: rawAttempts, error } = await mapp
    .from("attempts")
    .select("id,participant_id,status,source,started_at,completed_at")
    .is("deleted_at", null)
    .order("started_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(`Chargement des résultats MAPP impossible : ${error.message}`);

  const attempts = (rawAttempts ?? []) as AttemptRow[];
  const participantIds = [...new Set(attempts.map((attempt) => attempt.participant_id))];
  const attemptIds = attempts.map((attempt) => attempt.id);
  const [{ data: profiles }, { data: revisions }] = await Promise.all([
    participantIds.length
      ? mapp.from("participant_profiles").select("participant_id,first_name,last_name,email").in("participant_id", participantIds)
      : Promise.resolve({ data: [] }),
    attemptIds.length
      ? mapp.from("result_revisions").select("id,attempt_id,revision").in("attempt_id", attemptIds).order("revision", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);
  const latestRevision = new Map<string, string>();
  for (const revision of revisions ?? []) if (!latestRevision.has(revision.attempt_id)) latestRevision.set(revision.attempt_id, revision.id);
  const revisionIds = [...latestRevision.values()];
  const { data: rankings } = revisionIds.length
    ? await mapp.from("result_rankings").select("result_revision_id,context,primary_code,secondary_code").in("result_revision_id", revisionIds)
    : { data: [] };
  const profileByParticipant = new Map((profiles ?? []).map((profile) => [profile.participant_id, profile]));

  return <main className="mx-auto max-w-7xl px-5 py-10 text-[#27302f]">
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#95617d]">Administration native</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Résultats MAPP</h1>
        <p className="mt-2 text-sm text-[#6b7270]">Données actives de Ministry School uniquement.</p>
      </div>
      <Link className="rounded-full bg-[#27302f] px-5 py-3 text-sm font-semibold text-[#fbeeda]" href="/admin/apps">Retour aux outils</Link>
    </header>
    <div className="overflow-x-auto rounded-2xl border border-[#ded6c9] bg-white shadow-sm">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-[#27302f] text-[#fbeeda]"><tr>
          <th className="px-4 py-3">Participant</th><th className="px-4 py-3">État</th><th className="px-4 py-3">Profil naturel</th><th className="px-4 py-3">Sous pression</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Source</th>
        </tr></thead>
        <tbody>
          {attempts.map((attempt) => {
            const profile = profileByParticipant.get(attempt.participant_id);
            const revisionId = latestRevision.get(attempt.id);
            const attemptRankings = (rankings ?? []).filter((ranking) => ranking.result_revision_id === revisionId);
            const natural = attemptRankings.find((ranking) => ranking.context === "natural");
            const pressure = attemptRankings.find((ranking) => ranking.context === "under_pressure");
            return <tr className="border-t border-[#eee8de]" key={attempt.id}>
              <td className="px-4 py-4"><strong>{[profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Sans nom"}</strong><br/><span className="text-xs text-[#6b7270]">{profile?.email || attempt.id}</span></td>
              <td className="px-4 py-4">{attempt.status}</td>
              <td className="px-4 py-4">{natural?.primary_code ? `${natural.primary_code} / ${natural.secondary_code ?? "—"}` : "—"}</td>
              <td className="px-4 py-4">{pressure?.primary_code ? `${pressure.primary_code} / ${pressure.secondary_code ?? "—"}` : "—"}</td>
              <td className="px-4 py-4">{new Date(attempt.completed_at ?? attempt.started_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}</td>
              <td className="px-4 py-4">{attempt.source}</td>
            </tr>;
          })}
          {!attempts.length && <tr><td className="px-4 py-10 text-center text-[#6b7270]" colSpan={6}>Aucune tentative MAPP.</td></tr>}
        </tbody>
      </table>
    </div>
  </main>;
}
