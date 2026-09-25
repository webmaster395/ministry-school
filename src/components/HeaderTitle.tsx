"use client";

import { usePathname } from "next/navigation";
import { useSpace } from "@/components/SpaceProvider";

// Titre affiché dans l'en-tête selon la page. Les tableaux de bord affichent la salutation.
const TITLES: Record<string, string> = {
  "/etudiant/cours": "Mes cours",
  "/etudiant/travail": "Travail à faire",
  "/etudiant/services": "Services et projets",
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
  "/gestion/admin/profil": "Profil",
};

export default function HeaderTitle({ greeting }: { greeting: string }) {
  const pathname = usePathname();
  const { current } = useSpace();

  // Dans un espace de gestion, l'en-tête porte le nom de l'espace, pas la salutation étudiante
  if (current) {
    return (
      <div className="min-w-0">
        <h1 className="font-title truncate text-[20px] leading-tight text-foreground">{current.title}</h1>
        <p className="hidden truncate text-[13px] leading-tight text-muted sm:block">{current.subtitle}</p>
      </div>
    );
  }

  // /etudiant/cours/<id> reste dans « Mes cours »
  const title =
    TITLES[pathname] ?? (pathname.startsWith("/etudiant/cours/") ? "Mes cours" : pathname.startsWith("/etudiant/services/") ? "Services et projets" : (pathname.startsWith("/gestion/enseignement/preparation/") || pathname.startsWith("/gestion/pilotage/preparation/")) ? "Préparer le cours" : greeting);

  return <h1 className="font-title text-[20px] leading-tight text-foreground">{title}</h1>;
}
