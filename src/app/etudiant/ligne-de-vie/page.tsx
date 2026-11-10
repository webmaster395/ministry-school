import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/data/viewer";
import { getCatalogAppBySlug, getStudentTools } from "@/lib/apps/catalog";
import LifeLineJourney from "@/app/preview/ligne-de-vie-v1/page";

export const dynamic = "force-dynamic";

export default async function LifeLinePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/etudiant/ligne-de-vie");
  if (viewer.deactivated) redirect("/auth/desactive");
  const app = viewer.roles.superAdmin
    ? await getCatalogAppBySlug("ma-ligne-de-vie")
    : (await getStudentTools()).find((item) => item.slug === "ma-ligne-de-vie") ?? null;
  if (!app && !viewer.roles.superAdmin) notFound();
  return <LifeLineJourney production />;
}
