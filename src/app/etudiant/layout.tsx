import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { SpaceProvider } from "@/components/SpaceProvider";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import SpaceTabs from "@/components/SpaceTabs";
import { getViewer } from "@/lib/data/viewer";

import WelcomeModal from "@/components/WelcomeModal";
import MlkEngagementModal from "@/components/MlkEngagementModal";
import StudentUsageTracker from "@/components/StudentUsageTracker";
import { createDiagnosticContext, traceServerStage } from "@/lib/server-render-diagnostics";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const diagnostic = createDiagnosticContext("/etudiant/*");
  const viewer = await traceServerStage(diagnostic, "student-layout-viewer", getViewer);
  if (!viewer) redirect("/login");
  if (viewer?.deactivated) redirect("/auth/desactive");
  const layoutContext = await traceServerStage(diagnostic, "student-layout-shape", async () => ({
    notesEnabled: viewer.courseNotesEnabled ?? false,
    roles: viewer.roles,
    unreadMessages: viewer.unreadMessages,
    fullName: viewer.fullName,
    avatarUrl: viewer.avatarUrl,
    ministrySlug: viewer.ministrySlug,
    ministryName: viewer.ministryName,
    welcomeSeen: viewer.welcomeSeen,
    mlkEngagement: viewer.mlkEngagement,
  }));

  return (
    <SpaceProvider
      roles={layoutContext.roles}
      unread={layoutContext.unreadMessages}
      notesEnabled={layoutContext.notesEnabled}
    >
      <StudentUsageTracker />
      <div className="app-shell flex min-h-screen w-full">
        <Sidebar
          fullName={layoutContext.fullName}
          avatarUrl={layoutContext.avatarUrl}
          ministrySlug={layoutContext.ministrySlug}
        />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-surface">
          <AppHeader />
          <main className="app-main mx-auto w-full max-w-[1280px] flex-1 px-4 py-5 sm:px-7 sm:py-7">
            <SpaceTabs />
            {children}
          </main>
          <AppFooter />
        </div>
      </div>
      {!layoutContext.welcomeSeen && (
        <WelcomeModal
          fullName={layoutContext.fullName}
          ministrySlug={layoutContext.ministrySlug}
          ministryName={layoutContext.ministryName}
        />
      )}
      {layoutContext.welcomeSeen && !layoutContext.mlkEngagement.completed && (
        <MlkEngagementModal initial={layoutContext.mlkEngagement} />
      )}
    </SpaceProvider>
  );
}
