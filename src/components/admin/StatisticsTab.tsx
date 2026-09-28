import Link from "next/link";
import BarChart, { type BarDatum } from "@/components/BarChart";
import { parseMlkEngagement } from "@/lib/mlk-engagement";
import { memberStatus, type Member } from "@/lib/data/admin-hub";
import type { Ministry } from "@/lib/data/admin";

const membersHref = (filter = "") => `/gestion/admin?onglet=membres${filter ? `&${filter}` : ""}`;

function StatCard({ value, label, detail, href }: { value: number; label: string; detail?: string; href?: string }) {
  const content = (
    <>
      <p className="font-title text-[32px] leading-none text-foreground tabular-nums">{value}</p>
      <p className="mt-3 text-sm font-medium text-foreground">{label}</p>
      {detail && <p className="mt-1 text-xs leading-relaxed text-muted">{detail}</p>}
    </>
  );

  return href ? (
    <Link href={href} className="rounded-lg border border-border bg-background p-5 transition hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">
      {content}
    </Link>
  ) : (
    <div className="rounded-lg border border-border bg-background p-5">{content}</div>
  );
}

export default function StatisticsTab({ members, ministries }: { members: Member[]; ministries: Ministry[] }) {
  const total = members.length;
  const statuses = {
    active: members.filter((member) => memberStatus(member) === "actif").length,
    pending: members.filter((member) => memberStatus(member) === "a_confirmer").length,
    disabled: members.filter((member) => memberStatus(member) === "desactive").length,
  };

  const engagement = members.map((member) => parseMlkEngagement(member.notification_prefs));
  const engagementData: BarDatum[] = [
    { label: "Aucun engagement", value: engagement.filter((item) => item.completed && item.none).length, href: membersHref("implication=aucun") },
    { label: "Équipiers MLK", value: engagement.filter((item) => item.completed && item.equipier).length, href: membersHref("implication=equipier") },
    { label: "Managers et adjoints", value: engagement.filter((item) => item.completed && item.manager).length, href: membersHref("implication=manager") },
    { label: "Collaborateurs salariés", value: engagement.filter((item) => item.completed && item.collaborator).length, href: membersHref("implication=collaborateur") },
    { label: "Non renseigné", value: engagement.filter((item) => !item.completed).length, href: membersHref("implication=non_renseigne") },
  ];

  const genderData: BarDatum[] = [
    { label: "Femmes", value: members.filter((member) => member.gender === "femme").length, href: membersHref("genre=femme") },
    { label: "Hommes", value: members.filter((member) => member.gender === "homme").length, href: membersHref("genre=homme") },
    { label: "Non renseigné", value: members.filter((member) => member.gender !== "femme" && member.gender !== "homme").length, href: membersHref("genre=non_renseigne") },
  ];

  const ministryData: BarDatum[] = [
    ...ministries.map((ministry) => ({
      label: ministry.name,
      value: members.filter((member) => member.ministry_id === ministry.id).length,
      slug: ministry.slug,
      href: membersHref(`sens=${ministry.slug}`),
    })),
    {
      label: "Ne sais pas encore",
      value: members.filter((member) => !member.ministry_id).length,
      fallbackIcon: "🤔",
      href: membersHref("sens=non_renseignee"),
    },
  ];

  const rolesData: BarDatum[] = [
    { label: "Étudiants", value: members.filter((member) => member.role === "student").length, href: membersHref("role=etudiant") },
    { label: "Formateurs", value: members.filter((member) => member.is_teacher || member.role === "teacher").length, href: membersHref("role=enseignant") },
    { label: "Responsables de service", value: members.filter((member) => member.is_service_lead).length, href: membersHref("role=responsable") },
    { label: "Chefs de projet", value: members.filter((member) => member.is_project_lead).length, href: membersHref("role=chef") },
    { label: "Pilotage ministériel", value: members.filter((member) => Boolean(member.ministry_lead_of)).length, href: membersHref("role=pilotage") },
    { label: "Administrateurs", value: members.filter((member) => member.role === "admin").length, href: membersHref("role=admin") },
  ];

  const profileData: BarDatum[] = [
    { label: "Genre renseigné", value: members.filter((member) => member.gender === "femme" || member.gender === "homme").length },
    { label: "Sensibilité identifiée", value: members.filter((member) => Boolean(member.ministry_id)).length },
    { label: "Implication renseignée", value: engagement.filter((item) => item.completed).length },
    { label: "Photo ajoutée", value: members.filter((member) => Boolean(member.avatar_path)).length },
  ];

  const monthlyCounts = new Map<string, number>();
  members.forEach((member) => {
    const month = member.created_at.slice(0, 7);
    if (month) monthlyCounts.set(month, (monthlyCounts.get(month) ?? 0) + 1);
  });
  const monthlyData: BarDatum[] = [...monthlyCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, value]) => ({
      label: new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`)),
      value,
    }));

  return (
    <div className="space-y-6">
      <header>
        <p className="label text-xs tracking-[0.18em] text-muted">Statistiques des membres</p>
        <h1 className="font-title mt-2 text-[28px] leading-tight text-foreground sm:text-[34px]">Comprendre la communauté Ministry School</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          Vue complète des comptes et des informations renseignées. Clique sur une catégorie pour afficher les membres correspondants.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard value={total} label="Membres au total" href={membersHref()} />
        <StatCard value={statuses.active} label="Comptes actifs" detail={total ? `${Math.round((statuses.active / total) * 100)} % des membres` : undefined} href={membersHref("statut=actif")} />
        <StatCard value={statuses.pending} label="À confirmer" detail="Adresse e-mail non confirmée" href={membersHref("statut=a_confirmer")} />
        <StatCard value={statuses.disabled} label="Comptes désactivés" href={membersHref("statut=desactive")} />
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <BarChart title="Implication à MLK" subtitle="Un seul statut d'implication par membre." data={engagementData} />
        <BarChart title="Répartition par genre" subtitle="Selon les informations déclarées par les membres." data={genderData} />
        <BarChart title="Sensibilités ministérielles" subtitle="Sensibilité choisie par chaque membre." data={ministryData} />
        <BarChart title="Rôles et accès" subtitle="Certains accès peuvent se cumuler pour une même personne." data={rolesData} />
        <BarChart title="Informations de profil" subtitle="Nombre de membres ayant renseigné chaque information." data={profileData} />
        <BarChart title="Évolution des inscriptions" subtitle="Nouveaux comptes créés par mois, sur les 12 derniers mois disponibles." data={monthlyData} unit="" />
      </div>
    </div>
  );
}
