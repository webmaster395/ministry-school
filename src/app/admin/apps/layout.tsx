import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { SpaceProvider } from "@/components/SpaceProvider";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import { getViewer } from "@/lib/data/viewer";
import { getStudentToolsEnabled } from "@/lib/apps/catalog";

export default async function AppsAdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/admin/apps");
  if (viewer.deactivated) redirect("/auth/desactive");
  if (!viewer.roles.superAdmin) redirect("/etudiant");
  const studentToolsEnabled = await getStudentToolsEnabled();
  return <SpaceProvider roles={viewer.roles} studentToolsEnabled={studentToolsEnabled} pendingValidationCount={viewer.pendingValidationCount}>
    <div className="app-shell flex min-h-screen w-full">
      <Sidebar fullName={viewer.fullName} avatarUrl={viewer.avatarUrl} ministrySlug={viewer.ministrySlug} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-surface">
        <AppHeader />
        <main className="app-main mx-auto w-full max-w-[1280px] flex-1 px-4 py-5 sm:px-7 sm:py-7">
          <AdminBreadcrumbs />
          {children}
        </main>
        <AppFooter />
      </div>
    </div>
  </SpaceProvider>;
}

