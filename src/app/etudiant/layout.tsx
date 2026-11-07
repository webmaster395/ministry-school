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
import { getStudentToolsEnabled } from "@/lib/apps/catalog";
import { createClient } from "@/lib/supabase/server";
import { getStudentOutstandingWorkCount } from "@/lib/data/student";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer?.deactivated) redirect("/auth/desactive");
  const notesEnabled = viewer?.courseNotesEnabled ?? false;
  const supabase = await createClient();
  const [studentToolsEnabled, studentWorkCount] = await Promise.all([
    getStudentToolsEnabled(),
    getStudentOutstandingWorkCount(supabase, viewer.id),
  ]);

  return (
    <SpaceProvider
      roles={viewer.roles}
      unread={viewer.unreadMessages}
      notesEnabled={notesEnabled}
      studentToolsEnabled={studentToolsEnabled}
      pendingValidationCount={viewer.pendingValidationCount}
      studentWorkCount={studentWorkCount}
    >
      <StudentUsageTracker />
      <div className="app-shell flex min-h-screen w-full">
        <Sidebar
          fullName={viewer.fullName}
          avatarUrl={viewer.avatarUrl}
          ministrySlug={viewer?.ministrySlug}
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
      {viewer && !viewer.welcomeSeen && (
        <WelcomeModal
          fullName={viewer.fullName}
          ministrySlug={viewer.ministrySlug}
          ministryName={viewer.ministryName}
        />
      )}
      {viewer?.welcomeSeen && !viewer.mlkEngagement.completed && (
        <MlkEngagementModal initial={viewer.mlkEngagement} />
      )}
    </SpaceProvider>
  );
}
