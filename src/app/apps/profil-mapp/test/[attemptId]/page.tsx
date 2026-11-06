import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/data/viewer";
import { openMappQuestionnaire } from "@/lib/mapp/server";
import { Hybrid44Runner } from "../../OfficialHybrid44Runner";

export const dynamic = "force-dynamic";

export default async function OfficialMappTestPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.deactivated || !viewer.roles.superAdmin) notFound();
  const { attemptId } = await params;
  const questionnaire = await openMappQuestionnaire();
  if (questionnaire.attemptId !== attemptId || questionnaire.engine !== "hybrid-44") notFound();
  if (questionnaire.status === "completed") redirect(`/apps/profil-mapp/test/${attemptId}/resultat`);
  return <Hybrid44Runner questionnaire={questionnaire} />;
}
