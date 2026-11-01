import { redirect } from "next/navigation";
import { getViewer } from "@/lib/data/viewer";

export default async function AppsAdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/admin/apps");
  if (viewer.deactivated) redirect("/auth/desactive");
  if (!viewer.roles.superAdmin) redirect("/etudiant");
  return children;
}

