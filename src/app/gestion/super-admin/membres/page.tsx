import SuperAdminHeader from "@/components/admin/SuperAdminHeader";
import MembersTab from "@/components/admin/MembersTab";
import MembersRolesNav from "@/components/admin/MembersRolesNav";

type Params = { q?: string; role?: string; sens?: string; statut?: string; tri?: string; implication?: string; genre?: string; page?: string; par?: string };

export default async function SuperAdminMembersPage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  return <div className="space-y-6"><SuperAdminHeader title="Membres et permissions" subtitle="Consultez l’annuaire complet, puis utilisez l’onglet Rôles pour gérer les responsabilités et les affectations." /><MembersRolesNav active="members" /><MembersTab q={p.q ?? ""} role={p.role ?? "tous"} sens={p.sens ?? "toutes"} statut={p.statut ?? "tous"} tri={p.tri ?? "nom"} implication={p.implication ?? "toutes"} genre={p.genre ?? "tous"} page={p.page ?? "1"} par={p.par ?? "50"} basePath="/gestion/super-admin/membres" /></div>;
}
