import { redirect } from "next/navigation";

export default function LegacySuperAdminRolesPage() {
  redirect("/gestion/admin?onglet=permissions");
}
