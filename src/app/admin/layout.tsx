import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import AppHeader from "@/components/AppHeader";
import { getViewer } from "@/lib/data/viewer";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (viewer?.deactivated) redirect("/auth/desactive");
  // Les onglets sont masqués aux autres rôles ; on bloque aussi l'accès direct par l'adresse.
  if (!viewer?.roles.admin) redirect("/etudiant");

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar roles={viewer!.roles} ministrySlug={viewer?.ministrySlug} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-surface">
        <AppHeader />
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-7 py-7">{children}</main>
      </div>
    </div>
  );
}
