import AppsStudioShell, { StudioPageHeader } from "@/components/apps-studio/AppsStudioShell";
import GeneropolyResults from "@/components/apps-studio/GeneropolyResults";
import { getGeneropolySessions, getGeneropolySnapshot } from "@/lib/apps/generopoly";

export const dynamic = "force-dynamic";

export default async function GeneropolyResultsPage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  let payload: { sessions: Awaited<ReturnType<typeof getGeneropolySessions>>; snapshot: Awaited<ReturnType<typeof getGeneropolySnapshot>> } | null = null;
  let error = "";
  try {
    const sessions = await getGeneropolySessions();
    const requested = (await searchParams).session;
    const session = sessions.find((item) => item.id === requested) ?? sessions[0];
    const snapshot = session ? await getGeneropolySnapshot(session.id) : { session: null, tables: [], syncedAt: 0 };
    payload = { sessions, snapshot };
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Connexion à Généropoly impossible.";
  }
  if (!payload) return <AppsStudioShell active="results" appTab="results"><StudioPageHeader eyebrow="GÉNÉROPOLY" title="Résultats" /><div className="rounded-[24px] border border-[#b83c13]/20 bg-white p-7 text-[#8f321c]">{error}</div></AppsStudioShell>;
  return <AppsStudioShell active="results" appTab="results"><StudioPageHeader eyebrow="GÉNÉROPOLY" title="Résultats" description="Chaque journée reste indépendante. Les moyennes excluent automatiquement les parties non validées." /><GeneropolyResults sessions={payload.sessions} snapshot={payload.snapshot} /></AppsStudioShell>;
}

