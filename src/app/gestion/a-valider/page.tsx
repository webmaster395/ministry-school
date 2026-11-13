import { redirect } from "next/navigation";
import { getViewer } from "@/lib/data/viewer";
import ValidationQueueContent from "@/components/admin/ValidationQueueContent";

export default async function ValidationPage({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  const viewer = await getViewer();
  if (!viewer?.roles.superAdmin) redirect("/etudiant");
  return <ValidationQueueContent requested={(await searchParams).onglet} />;
}
