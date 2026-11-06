import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ProfilMappPage() {
  // La restitution officielle reste servie par le projet MAPP validé. Ce
  // chemin intermédiaire permet à Vercel de l'afficher sous le domaine
  // Ministry sans laisser la page locale incomplète prendre la priorité.
  redirect("/apps/profil-mapp/officiel");
}
