import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/data/viewer";
import { OfficialTieBreakForm } from "./OfficialTieBreakForm";

export default async function OfficialTieBreakPage({ params, searchParams }: { params: Promise<{ attemptId: string }>; searchParams: Promise<{ revision?: string }> }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.deactivated || !viewer.roles.superAdmin) notFound();
  const [{ attemptId }, query] = await Promise.all([params, searchParams]);
  if (!query.revision) notFound();
  return <OfficialTieBreakForm attemptId={attemptId} revisionId={query.revision} />;
}
