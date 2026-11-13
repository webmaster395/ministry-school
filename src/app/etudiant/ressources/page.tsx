import { redirect } from "next/navigation";
import ResourceLibrary from "@/components/ResourceLibrary";
import { getViewer } from "@/lib/data/viewer";
import { getStudentResourceLibrary } from "@/lib/data/resource-library";
import { createClient } from "@/lib/supabase/server";
import { getStudentTools } from "@/lib/apps/catalog";

export const dynamic = "force-dynamic";

export default async function StudentResourcesPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const supabase = await createClient();
  const [resources, tools] = await Promise.all([
    getStudentResourceLibrary(supabase, viewer.id),
    getStudentTools(),
  ]);
  const toolResources = [
    ...(tools.some((tool) => tool.slug === "generopoly") ? [{
      id: "tool:generopoly", title: "Généropoly", description: "Explorer ses choix financiers et la gestion de ses ressources.", kind: "tool" as const, source: "course" as const, sourceLabel: "Outil", sourceTitle: "Ministry School", href: "/apps/generopoly", availableAt: null,
    }] : []),
    { id: "tool:generosity", title: "Simulateur de générosité", description: "Découvrir la place de la générosité dans son budget.", kind: "tool" as const, source: "course" as const, sourceLabel: "Outil", sourceTitle: "Ministry School", href: "https://generosite.jeveuxdonner.fr/", availableAt: null },
  ];
  return <ResourceLibrary resources={[...resources, ...toolResources]} />;
}
