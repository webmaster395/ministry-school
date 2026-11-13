import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMembers } from "@/lib/data/admin-hub";
import MembersTab from "@/components/admin/MembersTab";
import RolesTab from "@/components/admin/RolesTab";
import StatisticsTab from "@/components/admin/StatisticsTab";
import { getMinistries, getMonthlyActiveUsers, getOpportunityAnalytics, getProgramAnalytics, getTrainingDayDates, getUsageAnalytics } from "@/lib/data/admin";
import { getViewer } from "@/lib/data/viewer";
import ManagementPageHeader from "@/components/management/ManagementPageHeader";
import AppCatalogManager, { StudentToolsSetting } from "@/components/apps-studio/AppCatalogManager";
import { getCatalogApps, getStudentToolsEnabled } from "@/lib/apps/catalog";
import AdminResourcesTab from "@/components/admin/AdminResourcesTab";
import { Plus } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";

type Params = {
  onglet?: string;
  vue?: string;
  q?: string;
  role?: string;
  sens?: string;
  statut?: string;
  tri?: string;
  implication?: string;
  genre?: string;
  page?: string;
  par?: string;
  statistiques?: string;
  categorie?: string;
  membre?: string;
};

export default async function AdminPage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const viewer = await getViewer();
  if (!viewer?.roles.superAdmin) redirect("/etudiant");

  if (["permissions", "roles"].includes(p.onglet ?? "")) redirect("/gestion/admin?onglet=membres&vue=permissions");
  if (p.onglet === "programme") redirect("/gestion/formations?scope=admin");
  const tab = ["membres", "outils", "ressources"].includes(p.onglet ?? "") ? p.onglet! : "pilotage";
  const supabase = await createClient();

  if (tab === "outils") {
    const [catalog, studentToolsEnabled] = await Promise.all([
      getCatalogApps({ includeUnpublished: true, includeArchived: true, channel: "admin" }),
      getStudentToolsEnabled(),
    ]);
    return <div className="space-y-6">
      <ManagementPageHeader eyebrow="ADMIN" title="Gestion des outils" subtitle="Publication, emplacements et présentation des outils pédagogiques." mobileTitleInAppBar actions={<Link href="/admin/apps/nouveau" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-accent px-4 text-xs font-semibold text-on-accent"><Plus size={15} /> Ajouter un outil</Link>} />
      <StudentToolsSetting enabled={studentToolsEnabled} />
      <AppCatalogManager apps={catalog.filter((app) => !app.archivedAt)} archivedApps={catalog.filter((app) => !!app.archivedAt)} studentToolsEnabled={studentToolsEnabled} />
    </div>;
  }

  if (tab === "ressources") {
    return <div className="space-y-6">
      <ManagementPageHeader eyebrow="ADMIN" title="Gestion des ressources" subtitle="Retrouvez les supports partagés dans les cours, projets et formations." mobileTitleInAppBar />
      <AdminResourcesTab supabase={supabase} q={p.q ?? ""} />
    </div>;
  }

  if (tab === "pilotage") {
    const [members, ministries, trainingDates, monthlyActivity, usage, opportunities] = await Promise.all([
      getMembers(supabase),
      getMinistries(supabase),
      getTrainingDayDates(supabase),
      getMonthlyActiveUsers(supabase),
      getUsageAnalytics(supabase),
      getOpportunityAnalytics(supabase),
    ]);
    const memberById = new Map(members.map((member) => [member.id, member]));
    const service = createServiceClient();
    const [authUsersResult, downloadUsageResult] = await Promise.all([
      service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      service.from("material_download_usage").select("material_id,user_id,open_count").order("open_count", { ascending: false }),
    ]);
    const neverSignedIn = authUsersResult.data.users
      .filter((user) => !user.last_sign_in_at && memberById.has(user.id))
      .map((user) => ({ id: user.id, name: memberById.get(user.id)?.full_name ?? "Membre", email: user.email ?? memberById.get(user.id)?.email ?? "" }));
    const downloaders: Record<string, { id: string; name: string; email: string; opens: number }[]> = {};
    for (const row of downloadUsageResult.data ?? []) {
      const member = memberById.get(row.user_id);
      if (!member) continue;
      (downloaders[row.material_id] ??= []).push({ id: member.id, name: member.full_name, email: member.email, opens: Number(row.open_count) });
    }
    const program = await getProgramAnalytics(supabase, usage.downloads);
    return <div className="space-y-6">
      <ManagementPageHeader eyebrow="SUPER ADMIN" title="Pilotage" subtitle="Toutes les statistiques de Ministry School, avec des vues globales et des filtres par sensibilité." mobileTitleInAppBar />
      <StatisticsTab members={members} ministries={ministries} trainingDates={trainingDates} monthlyActivity={monthlyActivity} usage={usage} usagePeople={{ neverSignedIn, downloaders }} program={program} opportunities={opportunities} section={p.statistiques ?? "utilisation"} />
    </div>;
  }

  const permissions = p.vue === "permissions";
  return <div className="space-y-5">
    <ManagementPageHeader eyebrow="SUPER ADMIN" title="Utilisateurs et accès" subtitle="Retrouvez chaque membre, sa fiche, ses résultats MAPP et l’ensemble de ses permissions." mobileTitleInAppBar />
    <nav aria-label="Sections des membres" className="inline-flex rounded-xl border border-border bg-background p-1">
      <Link href="/gestion/admin?onglet=membres" aria-current={!permissions ? "page" : undefined} className={`rounded-lg px-4 py-2.5 text-sm font-semibold ${!permissions ? "bg-accent text-on-accent" : "text-muted hover:bg-surface hover:text-foreground"}`}>Annuaire</Link>
      <Link href="/gestion/admin?onglet=membres&vue=permissions" aria-current={permissions ? "page" : undefined} className={`rounded-lg px-4 py-2.5 text-sm font-semibold ${permissions ? "bg-accent text-on-accent" : "text-muted hover:bg-surface hover:text-foreground"}`}>Permissions</Link>
    </nav>
    {permissions ? <RolesTab
      q={p.q ?? ""}
      category={p.categorie ?? "toutes"}
      canManageAccess
      basePath="/gestion/admin"
      selectedMemberId={p.membre ?? ""}
      projectsTrainingAccess={viewer.roles.projectsTraining}
      ministryAccess={viewer.roles.steeringMinistryIds.length > 0}
      embedded
    /> : <MembersTab
      q={p.q ?? ""}
      role={p.role ?? "tous"}
      sens={p.sens ?? "toutes"}
      statut={p.statut ?? "tous"}
      tri={p.tri ?? "nom"}
      implication={p.implication ?? "toutes"}
      genre={p.genre ?? "tous"}
      page={p.page ?? "1"}
      par={p.par ?? "50"}
      canManageAccess
    />}
  </div>;
}
