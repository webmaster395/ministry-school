import NewOpportunity from "@/components/gestion/NewOpportunity";

export default async function NewTrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ exemple?: string }>;
}) {
  const { exemple } = await searchParams;
  return <NewOpportunity type="formation" exemple={exemple === "1" || exemple === "true"} />;
}
