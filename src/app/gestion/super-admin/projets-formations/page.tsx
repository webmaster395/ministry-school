import { redirect } from "next/navigation";

export default function SuperAdminOpportunitiesPage() {
  redirect("/gestion/projets-formations?scope=super");
}
