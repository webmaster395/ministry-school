"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSpace } from "@/components/SpaceProvider";

type Crumb = { label: string; href?: string };

const tabLabels: Record<string, string> = {
  pilotage: "Pilotage",
  vue: "Vue d’ensemble",
  statistiques: "Statistiques",
  programme: "Programme",
  membres: "Membres",
  permissions: "Permissions",
  notifications: "Notifications",
};

const pageLabels: Record<string, string> = {
  "/gestion/admin/cours": "Cours",
  "/gestion/admin/cours-formations": "Cours et formations",
  "/gestion/admin/ministeres": "Sensibilités ministérielles",
  "/gestion/admin/programme": "Programme",
  "/gestion/admin/seances": "Programme",
  "/gestion/a-valider": "À valider",
  "/gestion/super-admin/pilotage": "Pilotage global",
};

function isIdentifier(segment: string) {
  return /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment) || /^\d+$/.test(segment);
}

export default function AdminBreadcrumbs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { current } = useSpace();
  const [pageTitle, setPageTitle] = useState("");
  const query = searchParams.toString();

  useEffect(() => {
    const readTitle = () => {
      const heading = document.querySelector<HTMLElement>("main h1");
      setPageTitle(heading?.textContent?.trim() ?? "");
    };
    readTitle();
    const observer = new MutationObserver(readTitle);
    observer.observe(document.querySelector("main") ?? document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname, query]);

  const crumbs = useMemo<Crumb[]>(() => {
    if (current?.key !== "admin") return [];

    if (pathname === "/gestion/admin") {
      const tab = searchParams.get("onglet") ?? "";
      return tabLabels[tab] ? [{ label: "Admin", href: "/gestion/admin" }, { label: tabLabels[tab] }] : [];
    }

    const root: Crumb[] = [{ label: "Admin", href: "/gestion/admin" }];
    if (pageLabels[pathname]) return [...root, { label: pageLabels[pathname] }];

    if (pathname.startsWith("/gestion/admin/membres/")) {
      return [...root, { label: "Membres", href: "/gestion/admin?onglet=membres" }, ...(pageTitle ? [{ label: pageTitle }] : [])];
    }

    if (pathname.startsWith("/gestion/admin/seances/")) {
      return [...root, { label: "Programme", href: "/gestion/admin?onglet=programme" }, ...(pageTitle ? [{ label: pageTitle }] : [])];
    }

    if (pathname.startsWith("/gestion/projets-formations")) {
      const listHref = "/gestion/projets-formations?scope=admin";
      if (pathname === "/gestion/projets-formations") return [...root, { label: "Projets et formations" }];
      if (pathname.endsWith("/nouveau")) return [...root, { label: "Projets et formations", href: listHref }, { label: "Créer" }];
      return [
        ...root,
        { label: "Projets et formations", href: listHref },
        ...(pageTitle ? [{ label: pageTitle }] : []),
      ];
    }

    if (pathname.startsWith("/gestion/enseignement/preparation/")) {
      return [...root, { label: "Cours et formations", href: "/gestion/admin/cours-formations" }, ...(pageTitle ? [{ label: pageTitle }] : [])];
    }

    const last = pathname.split("/").filter(Boolean).at(-1) ?? "";
    if (!last || isIdentifier(last)) return root;
    return [...root, { label: last.replaceAll("-", " ").replace(/^./, (letter) => letter.toLocaleUpperCase("fr-FR")) }];
  }, [current?.key, pageTitle, pathname, searchParams]);

  if (crumbs.length < 2) return null;

  return (
    <nav aria-label="Fil d’Ariane" className="mb-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ol className="flex min-w-max items-center gap-1.5 whitespace-nowrap text-xs text-muted">
        {crumbs.map((crumb, index) => {
          const currentCrumb = index === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight aria-hidden="true" size={13} className="shrink-0 text-muted/60" />}
              {crumb.href && !currentCrumb ? (
                <Link href={crumb.href} className="rounded px-1 py-1 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30">
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current={currentCrumb ? "page" : undefined} className={currentCrumb ? "px-1 font-medium text-foreground" : "px-1"}>{crumb.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
