"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useSpace } from "@/components/SpaceProvider";

// Titre affiché dans l'en-tête selon la page. Les tableaux de bord affichent la salutation.
const TITLES: Record<string, string> = {
  "/etudiant/cours": "Mes cours",
  "/etudiant/travail": "Travail à faire",
  "/etudiant/notes": "Mes notes",
  "/etudiant/services": "Projets et formations",
  "/etudiant/aide": "Une question ?",
  "/gestion/enseignement": "Préparer mes cours",
  "/gestion/pilotage": "Pilotage ministériel",
  "/etudiant/calendrier": "Mon calendrier",
  "/etudiant/formation": "Mon ministère",
  "/etudiant/messages": "Messagerie",
  "/etudiant/profil": "Profil",
  "/etudiant/preferences": "Préférences",
  "/enseignant/calendrier": "Mon calendrier",
  "/enseignant/supports": "Supports & consignes",
  "/enseignant/seances": "Séances",
  "/enseignant/programme": "Vue promo",
  "/gestion/enseignement/messages": "Communication",
  "/gestion/communication": "Communication",
  "/enseignant/etudiants": "Mes étudiants",
  "/enseignant/profil": "Profil",
  "/gestion/admin/cours": "Cours",
  "/gestion/admin/seances": "Séances",
  "/gestion/admin/utilisateurs": "Utilisateurs",
  "/gestion/admin/roles": "Rôles et accès",
  "/gestion/super-admin/roles": "Permissions",
  "/gestion/admin/profil": "Profil",
};

const ADMIN_TABS: Record<string, string> = {
  pilotage: "Pilotage",
  vue: "Vue d’ensemble",
  statistiques: "Statistiques",
  programme: "Programme",
  membres: "Membres",
  permissions: "Permissions",
  roles: "Permissions",
  notifications: "Notifications",
};

/**
 * Le titre de la barre supérieure doit décrire la page réellement ouverte, comme dans
 * l’espace étudiant. Les routes historiques restent volontairement prises en charge :
 * leur nom technique ne doit pas réapparaître dans l’interface.
 */
function adminPageTitle(pathname: string, tab: string | null) {
  if (pathname === "/gestion/admin") return (tab && ADMIN_TABS[tab]) || "Admin";
  if (pathname.startsWith("/gestion/admin/cours-formations")) return "Cours et formations";
  if (pathname.startsWith("/gestion/admin/ministeres")) return "Sensibilités ministérielles";
  if (pathname.startsWith("/gestion/admin/membres/")) return "Membre";
  if (pathname.startsWith("/gestion/admin/programme") || pathname.startsWith("/gestion/admin/seances")) return "Programme";
  if (pathname.startsWith("/gestion/admin/cours")) return "Cours et formations";
  if (pathname.startsWith("/gestion/admin/profil")) return "Profil";
  if (pathname.startsWith("/gestion/a-valider") || pathname.startsWith("/gestion/super-admin/a-valider")) return "À valider";
  if (pathname.startsWith("/gestion/super-admin/pilotage")) return "Pilotage global";
  if (pathname.startsWith("/gestion/super-admin/ministeres")) return "Sensibilités ministérielles";
  if (pathname.startsWith("/gestion/super-admin/membres")) return "Membres";
  if (pathname.startsWith("/gestion/super-admin/roles")) return "Permissions";
  if (pathname.startsWith("/gestion/super-admin/cours")) return "Cours et formations";
  if (pathname.startsWith("/gestion/projets-formations")) return "Projets et formations";
  if (pathname.startsWith("/gestion/enseignement/preparation/")) return "Cours et formations";
  return "Admin";
}

export default function HeaderTitle({ greeting }: { greeting: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { current } = useSpace();

  // Dans un espace de gestion, l'en-tête porte le nom de l'espace, pas la salutation étudiante
  if (current) {
    if (current.key === "admin") {
      return (
        <h1 className="font-title truncate text-[20px] leading-tight text-foreground">
          {adminPageTitle(pathname, searchParams.get("onglet"))}
        </h1>
      );
    }
    return (
      <div className="min-w-0">
        <h1 className="font-title truncate text-[20px] leading-tight text-foreground">
          {current.title}
        </h1>
        <p className="hidden truncate text-[13px] leading-tight text-muted sm:block">
          {current.subtitle}
        </p>
      </div>
    );
  }

  // /etudiant/cours/<id> reste dans « Mes cours »
  const title =
    TITLES[pathname] ??
    (pathname.startsWith("/etudiant/cours/")
      ? "Mes cours"
      : pathname.startsWith("/etudiant/notes/")
        ? "Mes notes"
        : pathname.startsWith("/etudiant/services/")
          ? "Projets et formations"
          : pathname.startsWith("/gestion/enseignement/preparation/") ||
              pathname.startsWith("/gestion/pilotage/preparation/")
            ? "Préparer le cours"
            : greeting);

  return (
    <h1 className="font-title text-[20px] leading-tight text-foreground">
      {title}
    </h1>
  );
}
