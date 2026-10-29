import { redirect } from "next/navigation";
import { getViewer } from "@/lib/data/viewer";

export default async function TeacherLayout() {
  const viewer = await getViewer();
  if (viewer?.deactivated) redirect("/auth/desactive");
  // Les onglets sont masqués aux autres rôles ; on bloque aussi l'accès direct par l'adresse.
  if (!viewer?.roles.admin && !viewer?.roles.steeringMinistryIds.length) redirect("/etudiant");
  // L'ancien espace enseignant exposait aussi des cours communs affectés comme intervenant.
  // Toute gestion passe désormais par l'espace Pilotage, filtré par sensibilité.
  redirect("/gestion/pilotage");
}
