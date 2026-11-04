import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/data/viewer";
import { getCatalogAppBySlug, getStudentTools } from "@/lib/apps/catalog";
import { graceIdentitySlug } from "@/lib/apps/grace-identity";
import { createClient } from "@/lib/supabase/server";
import GraceIdentityTool from "@/components/apps/GraceIdentityTool";

export const dynamic = "force-dynamic";

export default async function GraceIdentityPage() {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=/apps/${graceIdentitySlug}`);
  if (viewer.deactivated) redirect("/auth/desactive");

  // Les Super admins peuvent tester le brouillon. Les étudiants n’accèdent au
  // parcours que si la publication étudiante effective autorise l’outil.
  const app = viewer.roles.superAdmin
    ? await getCatalogAppBySlug(graceIdentitySlug)
    : (await getStudentTools()).find((item) => item.slug === graceIdentitySlug) ?? null;
  // Sur une prévisualisation de branche, la migration catalogue peut ne pas
  // encore avoir été appliquée. Le brouillon reste néanmoins testable par un
  // Super admin, sans jamais ouvrir l’URL aux étudiants.
  if (!app && !viewer.roles.superAdmin) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("grace_identity_assessments")
    .select("test_key,answers,results,completed_at,updated_at")
    .eq("user_id", viewer.id);

  return <GraceIdentityTool initial={(data ?? []) as never[]} preview={viewer.roles.superAdmin && (!app || !app.studentVisible)} />;
}
