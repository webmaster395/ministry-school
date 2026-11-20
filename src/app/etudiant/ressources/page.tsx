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
  const fixedToolResources = [
    { id: "tool:generopoly", title: "Généropoly", description: "Explore tes choix financiers et la gestion de ton temps.", kind: "tool" as const, source: "course" as const, sourceLabel: "Outil", sourceTitle: "Ministry School", href: "/apps/generopoly", availableAt: null },
    { id: "test:profil-mapp", title: "Profil MAPP", description: "Découvre ta manière naturelle d’agir, de communiquer et de décider.", kind: "tool" as const, source: "course" as const, sourceLabel: "Test", sourceTitle: "Mon identité", href: "/apps/profil-mapp", availableAt: null },
    { id: "test:fruit-spirit", title: "Fruit de l’Esprit", description: "Observe les fruits déjà présents et ceux qui sont en train de grandir.", kind: "tool" as const, source: "course" as const, sourceLabel: "Test", sourceTitle: "Mon identité", href: "/etudiant/identite/fruit-de-lesprit", availableAt: null },
    { id: "test:spiritual-gifts", title: "Dons spirituels", description: "Explore les dons qui se manifestent et ceux que tu peux développer.", kind: "tool" as const, source: "course" as const, sourceLabel: "Test", sourceTitle: "Mon identité", href: "/etudiant/identite/dons-spirituels", availableAt: null },
    { id: "test:natural-skills", title: "Compétences naturelles", description: "Identifie tes forces et les compétences que tu souhaites faire grandir.", kind: "tool" as const, source: "course" as const, sourceLabel: "Test", sourceTitle: "Mon identité", href: "/etudiant/identite/competences-naturelles", availableAt: null },
    { id: "test:life-line", title: "Ma ligne de vie", description: "Relis ton parcours et les événements qui éclairent ton appel.", kind: "tool" as const, source: "course" as const, sourceLabel: "Outil", sourceTitle: "Mon identité", href: "/etudiant/ligne-de-vie", availableAt: null },
    { id: "tool:generosity", title: "Simulateur de générosité", description: "Découvre la place de la générosité dans ton budget.", kind: "tool" as const, source: "course" as const, sourceLabel: "Outil", sourceTitle: "Ministry School", href: "https://generosite.jeveuxdonner.fr/", availableAt: null },
  ];
  const knownHrefs = new Set(fixedToolResources.map((resource) => resource.href));
  const catalogResources = tools
    .filter((tool) => tool.placementResources && !knownHrefs.has(tool.url))
    .map((tool) => ({
      id: `catalog:${tool.id}`,
      title: tool.resourceTitle,
      description: tool.resourceDescription || tool.description,
      kind: "tool" as const,
      source: "course" as const,
      sourceLabel: "Outil",
      sourceTitle: "Ministry School",
      href: `/etudiant/outils/${tool.slug}/ouvrir`,
      availableAt: null,
    }));
  const toolResources = [...fixedToolResources, ...catalogResources];
  return <ResourceLibrary resources={[...resources, ...toolResources]} />;
}
