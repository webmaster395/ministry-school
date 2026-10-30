import { redirect } from "next/navigation";

export default function UnifiedAdminOpportunitiesPage() {
  redirect("/gestion/projets-formations?scope=admin");
}
