import { notFound } from "next/navigation";
import { getViewer } from "@/lib/data/viewer";
import { OfficialTieBreakForm } from "./OfficialTieBreakForm";
import { guestOwnsAttempt } from "@/lib/mapp/guest";

export default async function OfficialTieBreakPage({ params, searchParams }: { params: Promise<{ attemptId: string }>; searchParams: Promise<{ revision?: string }> }) {
  const [{ attemptId }, query] = await Promise.all([params, searchParams]);
  const guest = await guestOwnsAttempt(attemptId);
  const viewer = guest ? null : await getViewer();
  if (!guest && (!viewer || viewer.deactivated || !viewer.roles.superAdmin)) notFound();
  if (!query.revision) notFound();
  return <OfficialTieBreakForm attemptId={attemptId} revisionId={query.revision} />;
}
