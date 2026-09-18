"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoLockup } from "@/components/Logo";
import MinistryPicto from "@/components/MinistryPicto";
import { getMinistry } from "@/lib/ministry";

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

const icons = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  calendar: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  book: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" />
      <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20" />
    </svg>
  ),
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="9" cy="8" r="3.25" />
      <path d="M2.5 20c0-3.2 2.9-5.5 6.5-5.5s6.5 2.3 6.5 5.5" />
      <path d="M16.5 4.8c1.6.4 2.75 1.8 2.75 3.45s-1.15 3.05-2.75 3.45" />
      <path d="M21.5 20c0-2.6-1.9-4.6-4.5-5.3" />
    </svg>
  ),
  megaphone: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M3 10v4a1 1 0 0 0 1 1h2l4 4V5L6 9H4a1 1 0 0 0-1 1Z" />
      <path d="M14 8.5c1.1.9 1.1 6.1 0 7M17.5 6c2.2 1.7 2.2 10.3 0 12" />
    </svg>
  ),
  layers: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </svg>
  ),
  compass: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="9" />
      <path d="m14.5 9.5-2 5-3-1.5 2-5 3 1.5Z" />
    </svg>
  ),
  globe: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 3.5 6 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-6-3.5-9s1-6.5 3.5-9Z" />
    </svg>
  ),
  building: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1" />
    </svg>
  ),
  user: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" />
    </svg>
  ),
};

const studentSections: NavSection[] = [
  {
    title: "Principale",
    items: [{ label: "Dashboard", href: "/etudiant", icon: icons.dashboard }],
  },
  {
    title: "Calendrier",
    items: [{ label: "Mon calendrier", href: "/etudiant/calendrier", icon: icons.calendar }],
  },
  {
    title: "Pédagogie",
    items: [
      { label: "Mes cours", href: "/etudiant/cours", icon: icons.book },
      { label: "Ma formation", href: "/etudiant/palier", icon: icons.layers },
      { label: "Ministères", href: "/etudiant/formation", icon: icons.compass },
    ],
  },
  {
    title: "Communication",
    items: [{ label: "Messages", href: "/etudiant/messages", icon: icons.megaphone }],
  },
  {
    title: "Compte",
    items: [{ label: "Profil", href: "/etudiant/profil", icon: icons.user }],
  },
];

const teacherSections: NavSection[] = [
  {
    title: "Principale",
    items: [{ label: "Dashboard", href: "/enseignant", icon: icons.dashboard }],
  },
  {
    title: "Calendrier",
    items: [{ label: "Mon calendrier", href: "/enseignant/calendrier", icon: icons.calendar }],
  },
  {
    title: "Pédagogie",
    items: [
      { label: "Supports & consignes", href: "/enseignant/supports", icon: icons.megaphone },
      { label: "Vue promo", href: "/enseignant/programme", icon: icons.globe },
      { label: "Socles", href: "/enseignant/socles", icon: icons.layers },
    ],
  },
  {
    title: "Communication",
    items: [{ label: "Messages", href: "/enseignant/messages", icon: icons.megaphone }],
  },
  {
    title: "Suivi",
    items: [{ label: "Mes étudiants", href: "/enseignant/etudiants", icon: icons.users }],
  },
  {
    title: "Compte",
    items: [{ label: "Profil", href: "/enseignant/profil", icon: icons.user }],
  },
];

const adminSections: NavSection[] = [
  {
    title: "Principale",
    items: [{ label: "Dashboard", href: "/admin", icon: icons.dashboard }],
  },
  {
    title: "Suivi",
    items: [
      { label: "Cours", href: "/admin/cours", icon: icons.book },
      { label: "Séances", href: "/admin/seances", icon: icons.calendar },
      { label: "Utilisateurs", href: "/admin/utilisateurs", icon: icons.users },
    ],
  },
  {
    title: "Compte",
    items: [{ label: "Profil", href: "/admin/profil", icon: icons.user }],
  },
];

export default function Sidebar({
  role,
  ministrySlug,
}: {
  role: "student" | "teacher" | "admin";
  ministrySlug?: string | null;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const sections =
    role === "student" ? studentSections : role === "teacher" ? teacherSections : adminSections;
  const ministry = getMinistry(ministrySlug);

  // Restaure le choix de l'utilisateur d'une visite à l'autre
  useEffect(() => {
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
    role === "admin" ? "Administration" : ministry ? `Sensibilité ${ministry.adjective}` : null;

  return (
    <aside
      className={`hidden shrink-0 flex-col border-r border-border bg-background transition-[width] duration-200 md:flex ${
        collapsed ? "w-[72px]" : "w-[272px]"
      }`}
    >
      {/* En-tête : l'ovale de la charte sur fond encre */}
      <div className="relative bg-foreground p-5">
        {collapsed ? (
          <div className="flex h-[54px] items-center justify-center">
            {ministry ? (
              <MinistryPicto slug={ministry.slug} size={32} />
            ) : (
              <span className="label text-[13px] text-on-accent">MS</span>
            )}
          </div>
        ) : (
          <LogoLockup priority />
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
          {role !== "admin" && ministry && <MinistryPicto slug={ministry.slug} size={20} />}
          {!collapsed && (
            <span className="label text-[10px] tracking-[0.18em] text-muted">{footerLabel}</span>
          )}
        </div>
      )}
    </aside>
  );
}
