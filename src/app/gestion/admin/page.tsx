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
import { FolderOpen, Plus, Wrench } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { graceIdentitySlug } from "@/lib/apps/grace-identity";

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
  contenu?: string;
};

export default async function AdminPage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const viewer = await getViewer();
  if (!viewer?.roles.superAdmin) redirect("/etudiant");

  if (["permissions", "roles"].includes(p.onglet ?? "")) redirect("/gestion/admin?onglet=membres&vue=permissions");
  if (p.onglet === "programme") redirect("/gestion/formations?scope=admin");
  const legacyContentTab = p.onglet === "ressources" ? "ressources" : p.onglet === "outils" ? "outils" : null;
  const tab = ["membres", "contenus", "outils", "ressources"].includes(p.onglet ?? "")
    ? (["outils", "ressources"].includes(p.onglet ?? "") ? "contenus" : p.onglet!)
    : "pilotage";
  const supabase = await createClient();

  if (tab === "contenus") {
    const contentTab = legacyContentTab ?? (p.contenu === "ressources" ? "ressources" : "outils");
    const [catalog, studentToolsEnabled] = await Promise.all([
      getCatalogApps({ includeUnpublished: true, includeArchived: true, channel: "admin" }),
      getStudentToolsEnabled(),
    ]);
    const isTools = contentTab === "outils";
    return <div className="mx-auto w-full max-w-[1180px] space-y-7 pb-10">
      <ManagementPageHeader
        eyebrow="ADMIN"
        title="Outils et ressources"
        subtitle="Configurez les outils et les contenus partagés depuis un seul espace clair."
        mobileTitleInAppBar
        actions={isTools
          ? <Link href="/admin/apps/nouveau" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-xs font-semibold text-on-accent"><Plus size={15} /> Ajouter un outil</Link>
          : <Link href="/admin/apps/resources/nouveau" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-xs font-semibold text-on-accent"><Plus size={15} /> Ajouter une ressource</Link>}
      />
      <nav aria-label="Outils et ressources" className="grid w-full gap-2 rounded-2xl border border-border bg-background p-2 sm:w-fit sm:grid-cols-2">
        <ContentTab href="/gestion/admin?onglet=contenus&contenu=outils" active={isTools} icon={<Wrench size={16} />} title="Outils" text="Tests, simulateurs et parcours" />
        <ContentTab href="/gestion/admin?onglet=contenus&contenu=ressources" active={!isTools} icon={<FolderOpen size={16} />} title="Ressources" text="PDF, vidéos, liens et documents" />
      </nav>
      <section className="rounded-[24px] border border-border bg-background p-5 shadow-[0_18px_60px_rgba(28,39,37,.05)] sm:p-7">
        {isTools ? <div className="space-y-6">
          <StudentToolsSetting enabled={studentToolsEnabled} />
          <AppCatalogManager apps={catalog.filter((app) => !app.archivedAt)} archivedApps={catalog.filter((app) => !!app.archivedAt && app.slug !== graceIdentitySlug)} studentToolsEnabled={studentToolsEnabled} />
        </div> : <AdminResourcesTab supabase={supabase} q={p.q ?? ""} />}
      </section>
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

function ContentTab({ href, active, icon, title, text }: { href: string; active: boolean; icon: React.ReactNode; title: string; text: string }) {
  return <Link href={href} aria-current={active ? "page" : undefined} className={`flex min-w-[250px] items-center gap-3 rounded-xl px-4 py-3 text-left transition ${active ? "bg-accent text-on-accent shadow-sm" : "text-foreground hover:bg-surface"}`}>
    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${active ? "bg-white/12" : "bg-surface"}`}>{icon}</span>
    <span><strong className="block text-sm font-semibold">{title}</strong><small className={`mt-0.5 block text-[11px] ${active ? "text-on-accent/70" : "text-muted"}`}>{text}</small></span>
  </Link>;
}
