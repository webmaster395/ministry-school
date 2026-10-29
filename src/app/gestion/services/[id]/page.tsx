import { redirect } from "next/navigation";

export default async function LegacyTrainingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/gestion/projets-formations/${id}`);
}
