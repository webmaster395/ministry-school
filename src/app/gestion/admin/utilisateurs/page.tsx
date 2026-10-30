import { redirect } from "next/navigation";

// La gestion des utilisateurs ne fait plus partie de l'espace Administrateur.
export default function UsersRedirect() {
  redirect("/gestion/admin");
}
