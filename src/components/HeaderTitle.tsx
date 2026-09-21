"use client";

import { usePathname } from "next/navigation";

// Titre affiché dans l'en-tête selon la page. Les tableaux de bord affichent la salutation.
const TITLES: Record<string, string> = {
  "/etudiant/cours": "Mes cours",
  "/etudiant/travail": "Travail à faire",
  "/etudiant/services": "Services et projets",
  "/etudiant/aide": "Une question ?",
  "/etudiant/enseignement": "Préparer mes cours",
  "/etudiant/pilotage": "Pilotage ministériel",
  "/etudiant/calendrier": "Mon calendrier",
  "/etudiant/formation": "Ministères",
  "/etudiant/messages": "Messages",
  "/etudiant/profil": "Profil",
  "/enseignant/calendrier": "Mon calendrier",
  "/enseignant/supports": "Supports & consignes",
  "/enseignant/seances": "Séances",
  "/enseignant/programme": "Vue promo",
  "/enseignant/messages": "Messages",
  "/enseignant/etudiants": "Mes étudiants",
  "/enseignant/profil": "Profil",
  "/admin/cours": "Cours",
  "/admin/seances": "Séances",
  "/admin/utilisateurs": "Utilisateurs",
  "/admin/roles": "Rôles et accès",
  "/admin/profil": "Profil",
};

export default function HeaderTitle({ greeting }: { greeting: string }) {
  const pathname = usePathname();

  // /etudiant/cours/<id> reste dans « Mes cours »
  const title =
    TITLES[pathname] ?? (pathname.startsWith("/etudiant/cours/") ? "Mes cours" : pathname.startsWith("/etudiant/services/") ? "Services et projets" : pathname.startsWith("/etudiant/preparation/") ? "Préparer le cours" : greeting);

  return <h1 className="font-title text-[22px] leading-tight text-foreground">{title}</h1>;
}
