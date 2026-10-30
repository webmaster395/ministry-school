import { createClient } from "@/lib/supabase/server";
import { getMembers, getOpportunitiesWithDates, getProgramEntries } from "@/lib/data/admin-hub";
import OverviewTab from "@/components/admin/OverviewTab";
import ProgramTab from "@/components/admin/ProgramTab";
import StatisticsTab from "@/components/admin/StatisticsTab";
import MembersTab from "@/components/admin/MembersTab";
import RolesTab from "@/components/admin/RolesTab";
import { getMinistries, getMonthlyActiveUsers, getOpportunityAnalytics, getProgramAnalytics, getTrainingDayDates, getUsageAnalytics } from "@/lib/data/admin";
import type { TrainerAdminRow } from "@/components/admin/TrainersTab";
import { getViewer } from "@/lib/data/viewer";
import { redirect } from "next/navigation";
import AdminHome from "@/components/admin/AdminHome";
import AdminPilotageSummary from "@/components/admin/AdminPilotageSummary";
import NotificationSettingsForm from "@/components/admin/NotificationSettingsForm";
import { getNotificationDigestSettings } from "@/lib/data/notification-settings";
import ManagementPageHeader from "@/components/management/ManagementPageHeader";

const VALID_TABS = ["pilotage", "vue", "statistiques", "programme", "membres", "permissions", "roles", "notifications"];

type Params = {
  onglet?: string;
  vue?: string;
  type?: string;
  phase?: string;
  filtre?: string;
  q?: string;
  role?: string;
  sens?: string;
  statut?: string;
  tri?: string;
  implication?: string;
  genre?: string;
  page?: string;
  par?: string;
  mois?: string;
  statistiques?: string;
  categorie?: string;
  membre?: string;
};

export default async function AdminPage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const tab = VALID_TABS.includes(p.onglet ?? "") ? p.onglet! : "accueil";

  const supabase = await createClient();
  const viewer = await getViewer();
  if (!viewer) redirect("/etudiant");
  if (tab === "roles") redirect("/gestion/admin?onglet=permissions");
  if (!viewer.roles.superAdmin && !["accueil", "pilotage"].includes(tab)) redirect("/gestion/admin");
  if (tab === "accueil") return <AdminHome viewer={viewer} />;
  if (tab === "pilotage") return <AdminPilotageSummary />;
  const today = new Date().toISOString().slice(0, 10);

  const opps = await getOpportunitiesWithDates(supabase);
  let trainers: TrainerAdminRow[] = [];
  if (tab === "programme") {
    const { data } = await supabase
      .from("trainers")
      .select("id, first_name, last_name, title, bio, photo_path, is_active")
      .order("is_active", { ascending: false })
      .order("last_name")
      .order("first_name");
    trainers = ((data ?? []) as Omit<TrainerAdminRow, "photoUrl">[]).map((trainer) => ({
      ...trainer,
      photoUrl: trainer.photo_path
        ? supabase.storage.from("trainer-photos").getPublicUrl(trainer.photo_path).data.publicUrl
        : null,
    }));
  }

  return (
    <div className="space-y-6">
      {tab === "vue" && (
        <OverviewTab
          members={await getMembers(supabase)}
          opps={opps}
          program={await getProgramEntries(supabase, opps)}
          today={today}
        />
      )}
      {tab === "statistiques" && await (async () => {
        const [members, ministries, trainingDates, monthlyActivity, usage, opportunities] = await Promise.all([
          getMembers(supabase),
          getMinistries(supabase),
          getTrainingDayDates(supabase),
          getMonthlyActiveUsers(supabase),
          getUsageAnalytics(supabase),
          getOpportunityAnalytics(supabase),
        ]);
        const program = await getProgramAnalytics(supabase, usage.downloads);
        return <StatisticsTab members={members} ministries={ministries} trainingDates={trainingDates} monthlyActivity={monthlyActivity} usage={usage} program={program} opportunities={opportunities} section={p.statistiques ?? "utilisation"} />;
      })()}
      {tab === "programme" && (
        <ProgramTab
          entries={await getProgramEntries(supabase, opps)}
          month={p.mois}
          today={today}
          trainers={trainers.filter((trainer) => trainer.is_active).map((trainer) => ({ id: trainer.id, name: `${trainer.first_name} ${trainer.last_name}`.trim() }))}
          ministries={(await getMinistries(supabase)).map((ministry) => ({ id: ministry.id, name: ministry.name }))}
        />
      )}
      {tab === "membres" && (
        <div className="space-y-5">
          <ManagementPageHeader eyebrow="ADMIN" title="Membres" subtitle="Consultez l’annuaire et les informations disponibles pour chaque membre." />
          <MembersTab
            q={p.q ?? ""}
            role={p.role ?? "tous"}
            sens={p.sens ?? "toutes"}
            statut={p.statut ?? "tous"}
            tri={p.tri ?? "nom"}
            implication={p.implication ?? "toutes"}
            genre={p.genre ?? "tous"}
            page={p.page ?? "1"}
            par={p.par ?? "50"}
          />
        </div>
      )}
      {tab === "permissions" && (
        <RolesTab
          q={p.q ?? ""}
          category={p.categorie ?? "toutes"}
          canManageAccess={!!viewer?.roles.superAdmin}
          basePath="/gestion/admin"
          selectedMemberId={p.membre ?? ""}
          projectsTrainingAccess={viewer.roles.projectsTraining}
          ministryAccess={viewer.roles.steeringMinistryIds.length > 0}
        />
      )}
      {tab === "notifications" && (
        <NotificationSettingsForm settings={await getNotificationDigestSettings(supabase)} />
      )}
    </div>
  );
}
