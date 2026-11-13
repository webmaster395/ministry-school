import { redirect } from "next/navigation";
import StudentToolFrame from "@/components/student/StudentToolFrame";
import { getViewer } from "@/lib/data/viewer";
import { getPublishedHeroesMotorsResult } from "@/lib/identity/heroes-motors";
import HeroesMotorsResultView from "./HeroesMotorsResultView";

export const dynamic = "force-dynamic";

export default async function HeroesMotorsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/etudiant/identite/mes-moteurs");
  const published = await getPublishedHeroesMotorsResult(viewer.id);
  if (!published) redirect("/etudiant/identite");
  return <StudentToolFrame className="max-md:!h-auto max-md:!overflow-visible" contentClassName="max-md:!overflow-visible"><HeroesMotorsResultView result={published} embedded /></StudentToolFrame>;
}
