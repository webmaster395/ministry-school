import { redirect } from "next/navigation";
import { getViewer } from "@/lib/data/viewer";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  // Le menu masque cet espace aux autres rôles ; on bloque aussi l'accès direct par l'adresse.
  if (!viewer?.roles.admin) redirect("/app");
  return children;
}
