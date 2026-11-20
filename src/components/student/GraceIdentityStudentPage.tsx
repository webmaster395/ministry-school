import { notFound } from "next/navigation";
import GraceIdentityTool from "@/components/apps/GraceIdentityTool";
import StudentToolFrame from "@/components/student/StudentToolFrame";
import { type GraceTestKey } from "@/lib/apps/grace-identity";
import { getViewer } from "@/lib/data/viewer";
import { getGraceIdentityToolData } from "@/lib/identity/feed";

export default async function GraceIdentityStudentPage({ test }: { test: GraceTestKey }) {
  const viewer = await getViewer();
  if (!viewer) notFound();
  const data = await getGraceIdentityToolData(viewer.id, viewer.roles.superAdmin);
  if (!data.allowed) notFound();
  return (
    <StudentToolFrame>
      <GraceIdentityTool initial={data.assessments as never[]} preview={viewer.roles.superAdmin && !data.studentVisible} initialTest={test} independent />
    </StudentToolFrame>
  );
}
