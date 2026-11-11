import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/data/viewer";
import { getCatalogAppBySlug, getStudentTools } from "@/lib/apps/catalog";
import LifeLineJourney from "@/app/preview/ligne-de-vie-v1/page";
import BackButton from "@/components/BackButton";

export const dynamic = "force-dynamic";

export default async function LifeLinePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/etudiant/ligne-de-vie");
  if (viewer.deactivated) redirect("/auth/desactive");
  const app = viewer.roles.superAdmin
    ? await getCatalogAppBySlug("ma-ligne-de-vie")
    : (await getStudentTools()).find((item) => item.slug === "ma-ligne-de-vie") ?? null;
  if (!app && !viewer.roles.superAdmin) notFound();
  return <div className="relative h-full min-h-0 overflow-hidden">
    <BackButton
      fallbackHref="/etudiant/identite"
      fallbackLabel="Mon identité"
      className="absolute left-5 top-5 z-50 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#fffaf0]/95 px-4 text-sm font-medium text-[#2b2420] shadow-sm backdrop-blur-sm transition hover:bg-white"
    />
    <LifeLineJourney production />
  </div>;
}
