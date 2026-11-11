import { redirect } from "next/navigation";
import GraceIdentityTool from "@/components/apps/GraceIdentityTool";
import StudentToolFrame from "@/components/student/StudentToolFrame";
import { type GraceTestKey } from "@/lib/apps/grace-identity";
import { getViewer } from "@/lib/data/viewer";
import { createClient } from "@/lib/supabase/server";

export default async function GraceIdentityStudentPage({ test }: { test: GraceTestKey }) {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=/etudiant/identite/${test === "fruit" ? "fruit-de-lesprit" : test === "gifts" ? "dons-spirituels" : "competences-naturelles"}`);
  if (viewer.deactivated) redirect("/auth/desactive");
  const supabase = await createClient();
  const { data } = await supabase
    .from("grace_identity_assessments")
    .select("test_key,answers,results,completed_at,updated_at")
    .eq("user_id", viewer.id);
  return (
    <StudentToolFrame>
      <GraceIdentityTool initial={(data ?? []) as never[]} preview={false} initialTest={test} independent />
    </StudentToolFrame>
  );
}
