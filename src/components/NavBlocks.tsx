"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import MinistryPicto from "@/components/MinistryPicto";
import { useSpace } from "@/components/SpaceProvider";
import { functionsIcon, profileTabs, studentSections } from "@/lib/nav";
import { getMinistry } from "@/lib/ministry";

const sameRoute = (pathname: string, href: string) => pathname === href.split("?")[0];

function NavLink({
  href,
  label,
  icon,
  active,
  collapsed,
  nested = false,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  collapsed: boolean;
  nested?: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`flex items-center rounded-[7px] text-[15px] transition ${
        nested ? "py-2 text-[14px]" : "py-2.5"
      } ${collapsed ? "justify-center px-1.5" : nested ? "gap-[11px] pl-[42px] pr-3" : "gap-[11px] px-3"} ${
        active ? "bg-foreground/[0.08] font-medium text-foreground" : "text-[#4b524f] hover:bg-foreground/[0.04]"
      }`}
    >
      {icon && (
        <span
          className={`${active ? "text-foreground" : "text-[#8b918e]"} ${
            collapsed ? "[&>svg]:h-[17px] [&>svg]:w-[17px]" : ""
          }`}
        >
          {icon}
        </span>
      )}
      {!collapsed && label}
    </Link>
  );
}

/**
 * Le menu commun à la barre latérale et au tiroir du téléphone : le menu étudiant, toujours
 * le même, puis le bloc « Mes espaces » pour ceux qui ont des fonctions de gestion.
 */
export function NavSections({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const { spaces, current, home } = useSpace();

  return (
    <>
      {studentSections.map((section) => (
        <div key={section.title}>
          {collapsed ? (
            <div className="mx-3 mb-2 border-t border-border-soft" aria-hidden="true" />
          ) : (
            <p className="label mb-2 px-3 text-[11px] !font-medium tracking-[0.16em] text-muted">{section.title}</p>
          )}
          <ul className="space-y-0.5">
            {section.items.map((item) => (
              <li key={item.label}>
                <NavLink
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={sameRoute(pathname, item.href)}
                  collapsed={collapsed}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}

      {spaces.length > 0 && home && (
        <div>
          {collapsed ? (
            <div className="mx-3 mb-2 border-t border-border-soft" aria-hidden="true" />
          ) : (
            <p className="label mb-2 px-3 text-[11px] !font-medium tracking-[0.16em] text-muted">Mes espaces</p>
          )}
          <ul className="space-y-0.5">
            <li>
              <NavLink href={home} label="Mes fonctions" icon={functionsIcon} active={!!current} collapsed={collapsed} />
            </li>
            {/* Dans un espace de gestion, ses pages se déplient sous « Mes fonctions » */}
            {current &&
              !collapsed &&
              current.sections.flatMap((section) =>
                section.items.map((item) => (
                  <li key={item.label}>
                    <NavLink
                      href={item.href}
                      label={item.label}
                      active={sameRoute(pathname, item.href)}
                      collapsed={false}
                      nested
                    />
                  </li>
                ))
              )}
          </ul>
        </div>
      )}
    </>
  );
}

/** La pastille du bas du menu : la photo ou l'initiale, le prénom, et le lien vers le profil. */
export function ProfileLink({
  fullName,
  avatarUrl,
  ministrySlug,
  collapsed = false,
}: {
  fullName: string;
  avatarUrl: string | null;
  ministrySlug?: string | null;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const { roles, unread } = useSpace();
  const ministry = getMinistry(ministrySlug);
  const active = profileTabs(roles).some((t) => sameRoute(pathname, t.href));
  const firstName = fullName.split(" ")[0] || "Mon profil";
  const initial = (fullName.trim().charAt(0) || "?").toUpperCase();

  return (
    <Link
      href="/etudiant/profil"
      title={collapsed ? "Mon profil" : undefined}
      className={`flex items-center gap-3 rounded-[7px] py-1.5 transition ${collapsed ? "justify-center px-1" : "px-2"} ${
        active ? "bg-foreground/[0.08]" : "hover:bg-foreground/[0.04]"
      }`}
    >
      <span className="relative shrink-0">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- adresse temporaire signée, non optimisable
          <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full border border-border object-cover" />
        ) : (
          <span className="font-title flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm text-on-accent">
            {initial}
          </span>
        )}
        {unread > 0 && collapsed && (
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-background bg-m-doctoral" aria-hidden="true" />
        )}
      </span>
      {!collapsed && (
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium text-foreground">{firstName}</span>
          {ministry && (
            <span className="label flex items-center gap-1.5 text-[10px] tracking-[0.14em] text-muted">
              <MinistryPicto slug={ministry.slug} size={12} />
              {ministry.adjective}
            </span>
          )}
        </span>
      )}
      {!collapsed && unread > 0 && (
        <span
          className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-m-doctoral px-1.5 text-xs font-semibold text-white"
          aria-label={`${unread} message${unread > 1 ? "s" : ""} non lu${unread > 1 ? "s" : ""}`}
        >
          {unread}
        </span>
      )}
    </Link>
  );
}
