import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Point d'entrée de la plateforme, après la connexion : tout le monde arrive sur la page d'accueil
 * (vue étudiant). L'accueil du site (« / ») est la landing publique.
 */
export default async function AppEntryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Non connecté → landing publique (pas la page de login directement,
  // plus naturel surtout à l'ouverture de la PWA pour la première fois)
  if (!user) redirect("/");

  // Tout le monde arrive sur la page d'accueil ; les fonctions s'ouvrent ensuite via « Mes fonctions »
  redirect("/etudiant");
}
