import Link from "next/link";
import { BadgeCheck, BellRing, BookOpen, ChartNoAxesColumnIncreasing, ChevronRight, Church, FolderKanban, ShieldCheck, UsersRound } from "lucide-react";
import type { Viewer } from "@/lib/data/viewer";

const commonSections = [
  { title: "Cours et formations", description: "Formation du cœur, Formation du caractère et programme ministériel.", href: "/gestion/admin/cours-formations", icon: BookOpen },
  { title: "Sensibilités ministérielles", description: "Apostolique, prophétique, évangélique, pastorale et doctorale.", href: "/gestion/admin/ministeres", icon: Church },
  { title: "Projets et formations", description: "Toutes les initiatives, leurs responsables, contributeurs et contenus.", href: "/gestion/admin/projets-formations", icon: FolderKanban },
] as const;

export default function AdminHome({ viewer }: { viewer: Viewer }) {
  const sections = viewer.roles.superAdmin ? [
    ...commonSections,
    { title: "À valider", description: "Demandes, corrections et publications programmées.", href: "/gestion/a-valider", icon: BadgeCheck, badge: true },
    { title: "Membres", description: "Annuaire de l’ensemble des membres de la plateforme.", href: "/gestion/admin?onglet=membres", icon: UsersRound },
    { title: "Permissions", description: "Rôles, affectations, niveaux d’accès et commentaires internes.", href: "/gestion/admin?onglet=permissions", icon: ShieldCheck },
    { title: "Pilotage global", description: "Vue d’ensemble, statistiques réelles et organisation du programme.", href: "/gestion/super-admin/pilotage", icon: ChartNoAxesColumnIncreasing },
    { title: "Notifications", description: "Fréquence, jour, heure et suivi des récapitulatifs étudiants.", href: "/gestion/admin?onglet=notifications", icon: BellRing },
  ] : [
    ...commonSections,
    { title: "Pilotage", description: "Les cinq indicateurs essentiels de Ministry School.", href: "/gestion/admin?onglet=pilotage", icon: ChartNoAxesColumnIncreasing },
  ];

  return <div className="space-y-7">
    <header>
      <span className="label inline-flex rounded-full border border-border bg-surface px-3 py-1 text-[10px] tracking-[.14em] text-muted">{viewer.roles.superAdmin ? "Super admin" : "Admin"}</span>
      <h1 className="font-title mt-3 text-[34px] leading-tight text-foreground sm:text-[42px]">Admin</h1>
    </header>
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sections.map((section) => { const Icon = section.icon; const badge = "badge" in section && section.badge; return <Link key={section.href} href={section.href} className="group flex min-h-[176px] flex-col rounded-2xl border border-border bg-background p-5 transition hover:border-foreground sm:p-6">
        <div className="flex items-start justify-between gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-surface text-foreground"><Icon size={21} strokeWidth={1.6} /></span><span className="flex items-center gap-2">{badge && viewer.pendingValidationCount > 0 && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-[#C43D32] px-1.5 text-[11px] font-semibold text-white">{viewer.pendingValidationCount}</span>}<ChevronRight size={18} className="text-muted transition group-hover:translate-x-0.5 group-hover:text-foreground" /></span></div>
        <h2 className="font-title mt-5 text-[22px] leading-tight text-foreground">{section.title}</h2><p className="mt-2 text-sm leading-relaxed text-muted">{section.description}</p>
      </Link>; })}
    </section>
  </div>;
}
