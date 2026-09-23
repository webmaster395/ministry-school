import OpportunityList from "@/components/gestion/OpportunityList";

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  const { onglet } = await searchParams;
  return <OpportunityList kind="projet" tab={onglet} />;
}
