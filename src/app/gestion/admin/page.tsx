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
  if (p.onglet === "programme") redirect("/gestion/admin/cours-formations");
  const tab = p.onglet === "membres" ? "membres" : "pilotage";
  const supabase = await createClient();

  if (tab === "pilotage") {
    const [members, ministries, trainingDates, monthlyActivity, usage, opportunities] = await Promise.all([
      getMembers(supabase),
      getMinistries(supabase),
      getTrainingDayDates(supabase),
      getMonthlyActiveUsers(supabase),
      getUsageAnalytics(supabase),
      getOpportunityAnalytics(supabase),
    ]);
    const program = await getProgramAnalytics(supabase, usage.downloads);
    return <div className="space-y-6">
      <ManagementPageHeader eyebrow="SUPER ADMIN" title="Pilotage" subtitle="Toutes les statistiques de Ministry School, avec des vues globales et des filtres par sensibilité." mobileTitleInAppBar />
      <StatisticsTab members={members} ministries={ministries} trainingDates={trainingDates} monthlyActivity={monthlyActivity} usage={usage} program={program} opportunities={opportunities} section={p.statistiques ?? "utilisation"} />
    </div>;
  }

  const permissions = p.vue === "permissions";
  return <div className="space-y-5">
    <ManagementPageHeader eyebrow="SUPER ADMIN" title="Membres" subtitle="Retrouvez chaque membre, sa fiche, ses résultats MAPP et l’ensemble de ses permissions." mobileTitleInAppBar />
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
