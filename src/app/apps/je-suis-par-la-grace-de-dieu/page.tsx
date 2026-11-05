import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/data/viewer";
import { graceIdentitySlug } from "@/lib/apps/grace-identity";
import { createClient } from "@/lib/supabase/server";
import GraceIdentityTool from "@/components/apps/GraceIdentityTool";

export const dynamic = "force-dynamic";

export default async function GraceIdentityPage() {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=/apps/${graceIdentitySlug}`);
  if (viewer.deactivated) redirect("/auth/desactive");

  // Cet outil reste exclusivement en test : aucune visibilité étudiante,
  // même en cas d’accès direct à son URL, avant une publication explicite.
  if (!viewer.roles.superAdmin) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("grace_identity_assessments")
    .select("test_key,answers,results,completed_at,updated_at")
    .eq("user_id", viewer.id);

  return <GraceIdentityTool initial={(data ?? []) as never[]} preview />;
}
