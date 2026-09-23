import OpportunityList from "@/components/gestion/OpportunityList";

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  const { onglet } = await searchParams;
  return <OpportunityList kind="formation" tab={onglet} />;
}
