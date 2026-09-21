"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoCompact } from "@/components/Logo";
import { BookOpen, Building2, CalendarDays, CircleUser, FileText, Globe, GraduationCap, ClipboardCheck, Compass, HandHeart, HelpCircle, House, KeyRound, MessageSquare, Users } from "lucide-react";
import MinistryPicto from "@/components/MinistryPicto";
import { getMinistry } from "@/lib/ministry";
import type { ViewerRoles } from "@/lib/data/viewer";

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {direction === "left" ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
    </svg>
  );
}

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const iconProps = { size: 20, strokeWidth: 1.6 } as const;

const icons = {
  dashboard: <House {...iconProps} />,
  calendar: <CalendarDays {...iconProps} />,
  book: <BookOpen {...iconProps} />,
  users: <Users {...iconProps} />,
  megaphone: <MessageSquare {...iconProps} />,
  layers: <GraduationCap {...iconProps} />,
  compass: <Users {...iconProps} />,
  globe: <Globe {...iconProps} />,
  building: <Building2 {...iconProps} />,
  user: <CircleUser {...iconProps} />,
  task: <FileText {...iconProps} />,
  spark: <HandHeart {...iconProps} />,
  key: <KeyRound {...iconProps} />,
  help: <HelpCircle {...iconProps} />,
  prep: <ClipboardCheck {...iconProps} />,
  steer: <Compass {...iconProps} />,
};

const studentSections: NavSection[] = [
  {
    title: "Principale",
    items: [{ label: "Accueil", href: "/etudiant", icon: icons.dashboard }],
  },
  {
    title: "Calendrier",
    items: [{ label: "Calendrier", href: "/etudiant/calendrier", icon: icons.calendar }],
  },
  {
    title: "Pédagogie",
    items: [
      { label: "Mes cours", href: "/etudiant/cours", icon: icons.book },
      { label: "Travail à faire", href: "/etudiant/travail", icon: icons.task },
      { label: "Ministères", href: "/etudiant/formation", icon: icons.compass },
      { label: "Services et projets", href: "/etudiant/services", icon: icons.spark },
    ],
  },
  {
    title: "Communication",
    items: [{ label: "Messages", href: "/etudiant/messages", icon: icons.megaphone }],
  },
  {
    title: "Compte",
    items: [
      { label: "Profil", href: "/etudiant/profil", icon: icons.user },
      { label: "Une question ?", href: "/etudiant/aide", icon: icons.help },
    ],
  },
];

/** Onglets en plus, selon les rôles : tout le monde garde la vue étudiant. */
function extraSections(roles: ViewerRoles): NavSection[] {
  const out: NavSection[] = [];

  if (roles.teacher) {
    out.push({
      title: "Enseignement",
      items: [
        { label: "Préparer mes cours", href: "/etudiant/enseignement", icon: icons.prep },
        { label: "Messages aux étudiants", href: "/enseignant/messages", icon: icons.megaphone },
      ],
    });
  }

  if (roles.steeringMinistryIds.length > 0) {
    out.push({
      title: "Pilotage ministériel",
      items: [{ label: "Pilotage", href: "/etudiant/pilotage", icon: icons.steer }],
    });
  }

  if (roles.serviceLead || roles.projectLead || roles.admin) {
    const label =
      roles.serviceLead && !roles.projectLead && !roles.admin
        ? "Proposer une formation"
        : roles.projectLead && !roles.serviceLead && !roles.admin
          ? "Proposer un projet"
          : "Proposer";
    out.push({
      title: "Services et projets",
      items: [{ label, href: "/etudiant/services/nouveau", icon: icons.spark }],
    });
  }

  if (roles.admin) {
    out.push({
      title: "Administration",
      items: [
        { label: "Vue d'ensemble", href: "/admin", icon: icons.dashboard },
        { label: "Séances", href: "/admin/seances", icon: icons.calendar },
      ],
    });
  }

  return out;
}

export default function Sidebar({
  roles,
  ministrySlug,
}: {
  roles: ViewerRoles;
  ministrySlug?: string | null;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const sections = [...studentSections, ...extraSections(roles)];
  const ministry = getMinistry(ministrySlug);

  // Restaure le choix de l'utilisateur d'une visite à l'autre
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lu après le montage pour éviter un écart serveur/navigateur
    setCollapsed(localStorage.getItem("sidebar-collapsed") === "1");
  }, []);

  function toggle() {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem("sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }

  const footerLabel =
    roles.admin ? "Administration" : ministry ? `Sensibilité ${ministry.adjective}` : null;

  return (
    <aside
      className={`hidden shrink-0 flex-col border-r border-border bg-background transition-[width] duration-200 md:flex ${
        collapsed ? "w-[72px]" : "w-[272px]"
      }`}
    >
      {/* En-tête : l'ovale de la charte sur fond encre */}
      <div className="relative flex h-[88px] items-center justify-center bg-foreground">
        {collapsed ? (
          <div className="flex items-center justify-center">
            {ministry ? (
              <MinistryPicto slug={ministry.slug} size={32} />
            ) : (
              <span className="label text-[13px] text-on-accent">MS</span>
            )}
          </div>
        ) : (
          <LogoCompact priority />
        )}
      </div>

      <div className={`flex ${collapsed ? "justify-center" : "justify-end"} px-3 pt-2`}>
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Déployer le menu" : "Réduire le menu"}
          title={collapsed ? "Déployer le menu" : "Réduire le menu"}
          className="rounded-md p-1 text-muted transition hover:bg-foreground/[0.04] hover:text-foreground"
        >
          <ChevronIcon direction={collapsed ? "right" : "left"} />
        </button>
      </div>

      <nav className={`flex-1 space-y-6 pb-6 pt-2 ${collapsed ? "px-3" : "px-4"}`}>
        {sections.map((section) => (
          <div key={section.title}>
            {collapsed ? (
              <div className="mx-3 mb-2 border-t border-border-soft" aria-hidden="true" />
            ) : (
              <p className="label mb-2 px-3 text-[11px] !font-medium tracking-[0.16em] text-muted">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center rounded-[7px] py-2.5 text-[15px] transition ${
                        collapsed ? "justify-center px-2" : "gap-[11px] px-3"
                      } ${
                        active
                          ? "bg-foreground/[0.08] font-medium text-foreground"
                          : "text-[#4b524f] hover:bg-foreground/[0.04]"
                      }`}
                    >
                      <span className={active ? "text-foreground" : "text-[#8b918e]"}>
                        {item.icon}
                      </span>
                      {!collapsed && item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Pied : sensibilité de l'utilisateur */}
      {footerLabel && (
        <div
          className={`flex items-center gap-2.5 border-t border-border-soft py-4 ${
            collapsed ? "justify-center px-2" : "px-5"
          }`}
        >
          {!roles.admin && ministry && <MinistryPicto slug={ministry.slug} size={20} />}
          {!collapsed && (
            <span className="label text-[10px] tracking-[0.18em] text-muted">{footerLabel}</span>
          )}
        </div>
      )}
    </aside>
  );
}
