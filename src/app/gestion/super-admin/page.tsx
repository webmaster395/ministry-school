import Link from "next/link";
import { BadgeCheck, BookOpen, ChartNoAxesColumnIncreasing, ChevronRight, Church, FolderKanban, UsersRound } from "lucide-react";
import { getViewer } from "@/lib/data/viewer";

const sections = [
  { title: "Cours et formations", description: "Formation du cœur, Formation du caractère et programme ministériel.", href: "/gestion/super-admin/cours", icon: BookOpen },
  { title: "Sensibilités ministérielles", description: "Apostolique, prophétique, évangélique, pastorale et doctorale.", href: "/gestion/super-admin/ministeres", icon: Church },
  { title: "Projets et formations", description: "Toutes les initiatives, leurs responsables, contributeurs et contenus.", href: "/gestion/super-admin/projets-formations", icon: FolderKanban },
  { title: "À valider", description: "Demandes, corrections et publications programmées.", href: "/gestion/super-admin/a-valider", icon: BadgeCheck, badge: true },
  { title: "Membres et permissions", description: "Annuaire, rôles, affectations et niveaux d’accès.", href: "/gestion/super-admin/membres", icon: UsersRound },
  { title: "Pilotage global", description: "Vue d’ensemble, statistiques réelles et organisation du programme.", href: "/gestion/super-admin/pilotage", icon: ChartNoAxesColumnIncreasing },
] as const;

export default async function SuperAdministrationHome() {
  const viewer = await getViewer();
  return <div className="space-y-7">
    <header><p className="label text-xs tracking-[.18em] text-muted">MES ESPACES ADMIN</p><h1 className="font-title mt-2 text-[34px] leading-tight text-foreground sm:text-[42px]">Super administration</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">Consultez l’ensemble de Ministry School depuis ce portail. Les modifications restent accessibles uniquement lorsque vous choisissez de les ouvrir.</p></header>
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sections.map((section) => { const { title, description, href, icon: Icon } = section; const badge = "badge" in section && section.badge; return <Link key={href} href={href} className="group flex min-h-[176px] flex-col rounded-2xl border border-border bg-background p-5 transition hover:border-foreground sm:p-6">
        <div className="flex items-start justify-between gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-surface text-foreground"><Icon size={21} strokeWidth={1.6} /></span><span className="flex items-center gap-2">{badge && !!viewer?.pendingValidationCount && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-[#C43D32] px-1.5 text-[11px] font-semibold text-white">{viewer.pendingValidationCount}</span>}<ChevronRight size={18} className="text-muted transition group-hover:translate-x-0.5 group-hover:text-foreground" /></span></div>
        <h2 className="font-title mt-5 text-[22px] leading-tight text-foreground">{title}</h2><p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
      </Link>; })}
    </section>
  </div>;
}
