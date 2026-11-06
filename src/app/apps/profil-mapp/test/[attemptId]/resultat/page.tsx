import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/data/viewer";
import { getMappResultBundle } from "@/lib/mapp/server";
import { OfficialResultClient } from "./OfficialResultClient";

export const dynamic = "force-dynamic";

export default async function OfficialMappResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.deactivated || !viewer.roles.superAdmin) notFound();
  const { attemptId } = await params;
  const bundle = await getMappResultBundle(attemptId).catch(() => null);
  if (!bundle) notFound();
  if (bundle.rankings.some((ranking) => ranking.tie_break_required && !ranking.resolved_order)) {
    redirect(`/apps/profil-mapp/test/${attemptId}/departage?revision=${bundle.resultRevisionId}`);
  }
  return <OfficialResultClient bundle={bundle} />;
}
