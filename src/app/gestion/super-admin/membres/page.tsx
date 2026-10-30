import { redirect } from "next/navigation";

export default function LegacySuperAdminMembersPage() {
  redirect("/gestion/admin?onglet=membres");
}
