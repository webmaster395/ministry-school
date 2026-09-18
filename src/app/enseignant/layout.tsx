import Sidebar from "@/components/Sidebar";
import AppHeader from "@/components/AppHeader";
import { getViewer } from "@/lib/data/viewer";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar role="teacher" ministrySlug={viewer?.ministrySlug} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col bg-surface">
        <AppHeader roleLabel="Enseignant" />
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-7 py-7">{children}</main>
      </div>
    </div>
  );
}
