import NewOpportunity from "@/components/gestion/NewOpportunity";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ exemple?: string }>;
}) {
  const { exemple } = await searchParams;
  return <NewOpportunity type="projet" exemple={exemple === "1" || exemple === "true"} />;
}
