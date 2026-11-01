import GeneropolyProjection from "@/components/apps-studio/GeneropolyProjection";
import { getGeneropolySessions, getGeneropolySnapshot } from "@/lib/apps/generopoly";

export const dynamic = "force-dynamic";

export default async function GeneropolyProjectionPage() {
  const sessions = await getGeneropolySessions();
  const initial = sessions[0] ? await getGeneropolySnapshot(sessions[0].id) : { session: null, tables: [], syncedAt: 0 };
  return <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#172522]"><GeneropolyProjection sessions={sessions} initial={initial} /></div>;
}

