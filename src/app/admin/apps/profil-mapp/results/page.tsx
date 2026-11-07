import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * L'administration officielle MAPP reste la source unique des passages et de
 * leurs résultats. Cette route Ministry ne maintient plus une deuxième liste
 * partielle issue du schéma natif récemment créé.
 */
export default function ProfilMappResultsPage() {
  redirect("/apps/profil-mapp/admin/participants");
}
