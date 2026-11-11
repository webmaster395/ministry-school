import { notFound } from "next/navigation";
import GraceIdentityTool from "@/components/apps/GraceIdentityTool";
import StudentToolFrame from "@/components/student/StudentToolFrame";
import { getCatalogAppBySlug, getStudentTools } from "@/lib/apps/catalog";
import { graceIdentitySlug, type GraceTestKey } from "@/lib/apps/grace-identity";
import { getViewer } from "@/lib/data/viewer";
import { createClient } from "@/lib/supabase/server";

export default async function GraceIdentityStudentPage({ test }: { test: GraceTestKey }) {
  const viewer = await getViewer();
  if (!viewer) notFound();
  const app = viewer.roles.superAdmin
    ? await getCatalogAppBySlug(graceIdentitySlug)
    : (await getStudentTools()).find((item) => item.slug === graceIdentitySlug) ?? null;
  if (!app && !viewer.roles.superAdmin) notFound();
  const supabase = await createClient();
  const { data } = await supabase
    .from("grace_identity_assessments")
    .select("test_key,answers,results,completed_at,updated_at")
    .eq("user_id", viewer.id);
  return (
    <StudentToolFrame>
      <GraceIdentityTool initial={(data ?? []) as never[]} preview={viewer.roles.superAdmin && !app?.studentVisible} initialTest={test} independent />
    </StudentToolFrame>
  );
}
