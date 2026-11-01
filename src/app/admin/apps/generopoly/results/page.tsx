import Link from "next/link";
import AppsStudioShell, { StudioPageHeader } from "@/components/apps-studio/AppsStudioShell";
import GeneropolyResults from "@/components/apps-studio/GeneropolyResults";
import { GeneropolyIntegrationError, getGeneropolySessions, getGeneropolySnapshot } from "@/lib/apps/generopoly";

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
    console.error("generopoly_results_page_load_failed", {
      message: cause instanceof Error ? cause.message : "unknown_error",
      status: cause instanceof GeneropolyIntegrationError ? cause.status : undefined,
      endpoint: cause instanceof GeneropolyIntegrationError ? cause.endpoint : undefined,
      path: cause instanceof GeneropolyIntegrationError ? cause.path : undefined,
    });
    error = "Impossible de charger les résultats pour le moment.";
  }
  if (!payload) return <AppsStudioShell active="results" appTab="results"><StudioPageHeader eyebrow="GÉNÉROPOLY" title="Résultats" /><div className="rounded-[24px] border border-[#b83c13]/20 bg-white p-7 text-[#8f321c]"><p>{error}</p><Link href="/admin/apps/generopoly/results" className="mt-5 inline-flex min-h-10 items-center rounded-xl bg-[#173f45] px-4 text-sm font-medium text-white">Réessayer</Link></div></AppsStudioShell>;
  return <AppsStudioShell active="results" appTab="results"><StudioPageHeader eyebrow="GÉNÉROPOLY" title="Résultats Généropoly" description="Retrouvez les résultats des ateliers et découvrez les choix des participants." /><GeneropolyResults sessions={payload.sessions} snapshot={payload.snapshot} /></AppsStudioShell>;
}

