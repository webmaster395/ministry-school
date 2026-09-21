import { redirect } from "next/navigation";

// Les membres sont désormais dans l'onglet « Membres et accès » de l'administration.
export default function UsersRedirect() {
  redirect("/admin?onglet=membres");
}
