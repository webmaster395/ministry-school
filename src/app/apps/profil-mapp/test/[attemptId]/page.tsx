import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/data/viewer";
import { openMappQuestionnaire } from "@/lib/mapp/server";
import { Hybrid44Runner } from "../../OfficialHybrid44Runner";
import { openGuestQuestionnaire } from "@/lib/mapp/guest";

export const dynamic = "force-dynamic";

export default async function OfficialMappTestPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const guestQuestionnaire = await openGuestQuestionnaire(attemptId);
  const viewer = guestQuestionnaire ? null : await getViewer();
  if (!guestQuestionnaire && (!viewer || viewer.deactivated)) notFound();
  const questionnaire = guestQuestionnaire ?? await openMappQuestionnaire();
  if (questionnaire.engine !== "hybrid-44") notFound();
  if (questionnaire.attemptId !== attemptId) redirect(`/apps/profil-mapp/test/${questionnaire.attemptId}?native=1`);
  if (questionnaire.status === "completed") redirect(`/apps/profil-mapp/test/${attemptId}/resultat?native=1`);
  return <Hybrid44Runner questionnaire={questionnaire} />;
}
