import SuperAdminHeader from "@/components/admin/SuperAdminHeader";
import MembersRolesNav from "@/components/admin/MembersRolesNav";
import RolesTab from "@/components/admin/RolesTab";

type Params = { q?: string; categorie?: string };

export default async function SuperAdminRolesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  return <div className="space-y-6">
    <SuperAdminHeader title="Membres et permissions" subtitle="Gérez les responsabilités administratives et opérationnelles sans mélanger cet écran avec l’annuaire général." />
    <MembersRolesNav active="roles" />
    <RolesTab q={params.q ?? ""} category={params.categorie ?? "toutes"} canManageAccess basePath="/gestion/super-admin/roles" />
  </div>;
}
