"use client";

import { usePathname } from "next/navigation";

// Titre affiché dans l'en-tête selon la page. Les tableaux de bord affichent la salutation.
const TITLES: Record<string, string> = {
  "/etudiant/cours": "Mes cours",
  "/etudiant/calendrier": "Mon calendrier",
  "/etudiant/formation": "Ministères",
  "/etudiant/palier": "Ma formation",
  "/etudiant/messages": "Messages",
  "/etudiant/profil": "Profil",
  "/enseignant/calendrier": "Mon calendrier",
  "/enseignant/supports": "Supports & consignes",
  "/enseignant/programme": "Vue promo",
  "/enseignant/socles": "Socles",
  "/enseignant/messages": "Messages",
  "/enseignant/etudiants": "Mes étudiants",
  "/enseignant/profil": "Profil",
  "/admin/cours": "Cours",
  "/admin/seances": "Séances",
  "/admin/utilisateurs": "Utilisateurs",
  "/admin/profil": "Profil",
};

export default function HeaderTitle({ greeting }: { greeting: string }) {
  const pathname = usePathname();

  // /etudiant/cours/<id> reste dans « Mes cours »
  const title =
    TITLES[pathname] ?? (pathname.startsWith("/etudiant/cours/") ? "Mes cours" : greeting);

  return <h1 className="font-title text-2xl leading-tight text-foreground">{title}</h1>;
}
