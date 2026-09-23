import OpportunityManage from "@/components/gestion/OpportunityManage";

export default async function ProjectManagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OpportunityManage id={id} kind="projet" />;
}
