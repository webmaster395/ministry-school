import AppsStudioShell, { StudioPageHeader } from "@/components/apps-studio/AppsStudioShell";
import MappResultsDangerZone from "@/components/apps-studio/MappResultsDangerZone";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type AttemptRow = {
  id: string;
  participant_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
};

type ProfileRow = {
  participant_id: string;
  first_name: string | null;
  last_name: string | null;
};

const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });

export default async function ProfilMappResultsPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const db = createServiceClient().schema("mapp");
  const [{ count, error: countError }, { data, error }] = await Promise.all([
    db.from("attempts").select("id", { count: "exact", head: true }).is("deleted_at", null),
    db.from("attempts").select("id,participant_id,status,started_at,completed_at").is("deleted_at", null).order("started_at", { ascending: false }).limit(50),
  ]);
  if (countError || error) throw new Error(`Chargement des résultats Profil MAPP impossible : ${countError?.message ?? error?.message}`);
  const attempts = (data ?? []) as AttemptRow[];
  const participantIds = [...new Set(attempts.map((attempt) => attempt.participant_id))];
  const { data: profiles, error: profilesError } = participantIds.length
    ? await db.from("participant_profiles").select("participant_id,first_name,last_name").in("participant_id", participantIds)
    : { data: [], error: null };
  if (profilesError) throw new Error(`Chargement des participants impossible : ${profilesError.message}`);
  const profileByParticipant = new Map(((profiles ?? []) as ProfileRow[]).map((profile) => [profile.participant_id, profile]));
  const query = await searchParams;

  return <AppsStudioShell active="applications" appTab="results" appSlug="profil-mapp" appName="Profil MAPP" hasResults hasEditor>
    <StudioPageHeader eyebrow="PROFIL MAPP" title="Résultats" description="Consulte les passages enregistrés et nettoie les résultats utilisés pour les tests." />
    {query.deleted && <p className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{query.deleted} résultat{query.deleted === "1" ? "" : "s"} supprimé{query.deleted === "1" ? "" : "s"} de l’administration.</p>}
    <section className="mb-6 rounded-[24px] border border-border bg-white p-5 sm:p-7">
      <div className="flex items-end justify-between gap-4"><div><p className="label text-[10px] text-muted">PASSAGES ACTIFS</p><strong className="mt-2 block font-title text-4xl font-normal">{count ?? 0}</strong></div><span className="text-xs text-muted">50 plus récents affichés</span></div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[650px] text-left text-sm">
          <thead className="border-b border-border text-xs text-muted"><tr><th className="py-3 pr-4 font-medium">Participant</th><th className="py-3 pr-4 font-medium">Date</th><th className="py-3 font-medium">Statut</th></tr></thead>
          <tbody>{attempts.map((attempt) => {
            const profile = profileByParticipant.get(attempt.participant_id);
            const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Participant sans nom";
            return <tr className="border-b border-border-soft last:border-0" key={attempt.id}><td className="py-4 pr-4 font-medium">{name}</td><td className="py-4 pr-4 text-muted">{date.format(new Date(attempt.completed_at ?? attempt.started_at))}</td><td className="py-4 text-muted">{attempt.status === "completed" ? "Terminé" : attempt.status === "in_progress" ? "Commencé" : attempt.status}</td></tr>;
          })}</tbody>
        </table>
        {!attempts.length && <p className="py-10 text-center text-sm text-muted">Aucun résultat Profil MAPP enregistré.</p>}
      </div>
    </section>
    <MappResultsDangerZone count={count ?? 0} />
  </AppsStudioShell>;
}
