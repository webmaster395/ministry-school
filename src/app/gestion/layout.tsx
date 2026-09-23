import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { SpaceProvider } from "@/components/SpaceProvider";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import SpaceTabs from "@/components/SpaceTabs";
import { getViewer } from "@/lib/data/viewer";
import { navSpaces } from "@/lib/nav";

/**
 * Le côté « fonctions » de la plateforme : pilotage, enseignement, services, projets, administration.
 * Séparé du côté étudiant (/etudiant) ; chaque espace vérifie en plus ses propres droits.
 */
export default async function ManagementLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (viewer?.deactivated) redirect("/auth/desactive");
  if (!viewer || navSpaces(viewer.roles).length === 0) redirect("/etudiant");

  return (
    <SpaceProvider roles={viewer.roles} unread={viewer.unreadMessages}>
      <div className="flex min-h-screen w-full">
        <Sidebar fullName={viewer.fullName} avatarUrl={viewer.avatarUrl} ministrySlug={viewer.ministrySlug} />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-surface">
          <AppHeader />
          <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-5 sm:px-7 sm:py-7">
            <SpaceTabs />
            {children}
          </main>
          <AppFooter />
        </div>
      </div>
    </SpaceProvider>
  );
}
