import GeneropolyProjection from "@/components/apps-studio/GeneropolyProjection";
import { getGeneropolySessions, getGeneropolySnapshot } from "@/lib/apps/generopoly";

export const dynamic = "force-dynamic";

export default async function GeneropolyProjectionPage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  const sessions = await getGeneropolySessions();
  const requested = (await searchParams).session;
  const selected = sessions.find((session) => session.id === requested) ?? sessions[0];
  const initial = selected ? await getGeneropolySnapshot(selected.id) : { session: null, tables: [], syncedAt: 0 };
  return <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#172522]"><GeneropolyProjection sessions={sessions} initial={initial} /></div>;
}

