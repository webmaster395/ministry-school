import { redirect } from "next/navigation";
import { getViewer } from "@/lib/data/viewer";

export default async function PreparationLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer?.roles.superAdmin) redirect("/etudiant");
  return children;
}
