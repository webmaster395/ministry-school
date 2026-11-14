import { notFound } from "next/navigation";
import GraceIdentityTool from "@/components/apps/GraceIdentityTool";
import StudentToolFrame from "@/components/student/StudentToolFrame";
import { graceIdentitySlug, graceIdentityToolSlugs, type GraceTestKey } from "@/lib/apps/grace-identity";
import { getStudentTools } from "@/lib/apps/catalog";
import { getViewer } from "@/lib/data/viewer";
import { createClient } from "@/lib/supabase/server";

export default async function GraceIdentityStudentPage({ test }: { test: GraceTestKey }) {
  const viewer = await getViewer();
  if (!viewer || viewer.deactivated) notFound();
  if (!viewer.roles.superAdmin) {
    const tools = await getStudentTools();
    const canAccess = tools.some((tool) => tool.slug === graceIdentityToolSlugs[test] || tool.slug === graceIdentitySlug);
    if (!canAccess) notFound();
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("grace_identity_assessments")
    .select("test_key,questionnaire_version,scoring_version,restitution_version,answers,results,completed_at,updated_at")
    .eq("user_id", viewer.id);
  return (
    <StudentToolFrame>
      <GraceIdentityTool initial={(data ?? []) as never[]} preview={viewer.roles.superAdmin} initialTest={test} independent />
    </StudentToolFrame>
  );
}
