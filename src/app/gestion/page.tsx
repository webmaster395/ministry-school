import { redirect } from "next/navigation";

// « /gestion » n'a pas de page propre : /app envoie chacun vers son espace de gestion.
export default function ManagementIndex() {
  redirect("/app");
}
