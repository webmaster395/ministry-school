import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";

/**
 * Point d'entrée de la plateforme, après la connexion : chacun arrive dans son espace de
 * gestion, sinon dans la vue étudiant. L'accueil du site (« / ») est la landing publique.
 */
export default async function AppEntryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Non connecté → landing publique (pas la page de login directement,
  // plus naturel surtout à l'ouverture de la PWA pour la première fois)
  if (!user) redirect("/");

  const viewer = await getViewer();
  const r = viewer?.roles;
  redirect(
    r?.admin
      ? "/gestion/admin"
      : r?.teacher
        ? "/gestion/enseignement"
        : r && r.steeringMinistryIds.length > 0
          ? "/gestion/pilotage"
          : r?.serviceLead
            ? "/gestion/services"
            : r?.projectLead
              ? "/gestion/projets"
              : "/etudiant"
  );
}
