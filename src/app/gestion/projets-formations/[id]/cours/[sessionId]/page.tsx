import { notFound } from "next/navigation";
import { PreparationPageContent } from "@/app/gestion/enseignement/preparation/[id]/page";

export default async function OpportunityCoursePage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id, sessionId } = await params;
  if (!id || !sessionId) notFound();
  return PreparationPageContent({
    params: Promise.resolve({ id: sessionId }),
    accessMode: "opportunity",
    opportunityId: id,
  });
}
