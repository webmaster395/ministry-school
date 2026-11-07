import { getStudentTools, type CatalogApp } from "@/lib/apps/catalog";
import { getViewer } from "@/lib/data/viewer";
import { getIdentityDashboard } from "@/lib/identity/dashboard";
import { getOfficialMappIdentityResults } from "@/lib/mapp/official-results";
import IdentityExperience, { type IdentityStoryGroup, type IdentityStoryItem } from "./IdentityExperience";
import { isMappGuestOpen } from "@/lib/mapp/access-window";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function toolItems(tool: CatalogApp): IdentityStoryItem[] {
  if (tool.slug === "je-suis-par-la-grace-de-dieu") return [
    { key: `${tool.id}-fruit`, name: "Fruit de l’Esprit", href: tool.url, iconUrl: tool.iconUrl },
    { key: `${tool.id}-gifts`, name: "Dons spirituels", href: tool.url, iconUrl: tool.iconUrl },
    { key: `${tool.id}-skills`, name: "Compétences naturelles", href: tool.url, iconUrl: tool.iconUrl },
  ];
  return [{ key: tool.id, name: tool.name, href: tool.url, iconUrl: tool.iconUrl }];
}

function buildStories(tools: CatalogApp[]): IdentityStoryGroup[] {
  const identity: IdentityStoryItem[] = [];
  const finance: IdentityStoryItem[] = [];
  for (const tool of tools) {
    if (tool.slug === "generopoly") finance.push(...toolItems(tool));
    if (tool.slug === "profil-mapp" || tool.slug === "je-suis-par-la-grace-de-dieu") identity.push(...toolItems(tool));
  }
  // Ces deux outils structurent Mon identité. Les stories doivent rester
  // visibles même pendant une modification de leur publication au catalogue.
  if (!identity.some((item) => item.name === "Profil MAPP")) {
    identity.unshift({ key: "profil-mapp", name: "Profil MAPP", href: "/apps/profil-mapp", iconUrl: null });
  }
  if (!finance.some((item) => item.name === "Généropoly")) {
    finance.unshift({ key: "generopoly", name: "Généropoly", href: "/apps/generopoly", iconUrl: null });
  }
  const groups: IdentityStoryGroup[] = [
    { key: "identity", label: "Identité", image: "/identity/stories/identity-v2.webp", items: identity },
    { key: "finance", label: "Finance", image: "/identity/stories/finance-v2.webp", items: finance },
  ];
  return groups.filter((group) => group.items.length > 0);
}

function monthsTogether(memberSince: string | null) {
  if (!memberSince) return 0;
  const start = new Date(memberSince);
  const now = new Date();
  return Math.max(0, (now.getUTCFullYear() - start.getUTCFullYear()) * 12 + now.getUTCMonth() - start.getUTCMonth());
}

function accountStatus(role: "student" | "admin", gender: "homme" | "femme" | null | undefined) {
  if (role === "admin") return gender === "femme" ? "Administratrice" : gender === "homme" ? "Administrateur" : "Administration";
  return gender === "femme" ? "Étudiante" : gender === "homme" ? "Étudiant" : "Étudiant·e";
}

function resultKindForItem(item: IdentityStoryItem) {
  if (item.key.endsWith("-fruit")) return "fruit";
  if (item.key.endsWith("-gifts")) return "gifts";
  if (item.key.endsWith("-skills")) return "skills";
  return null;
}

function buildUpcoming(tools: CatalogApp[], completedKinds: Set<string>) {
  return tools.flatMap((tool) => {
    if (tool.slug === "profil-mapp") return completedKinds.has("mapp") ? [] : [{ key: tool.id, name: "Profil MAPP", href: tool.url, iconUrl: tool.iconUrl, category: "Identité" }];
    if (tool.slug === "je-suis-par-la-grace-de-dieu") return toolItems(tool).flatMap((item) => {
      const kind = resultKindForItem(item);
      return kind && !completedKinds.has(kind) ? [{ ...item, category: "Identité" }] : [];
    });
    if (tool.slug === "generopoly") return completedKinds.has("generopoly") ? [] : [{ key: tool.id, name: "Généropoly", href: tool.url, iconUrl: tool.iconUrl, category: "Finance" }];
    if (tool.slug.includes("apest")) return completedKinds.has("apest") ? [] : [{ key: tool.id, name: tool.name, href: tool.url, iconUrl: tool.iconUrl, category: "Identité" }];
    return [];
  });
}

export default async function StudentIdentityPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.deactivated) redirect("/auth/desactive");
  if (!viewer.roles.superAdmin && !isMappGuestOpen()) redirect("/etudiant");
  const [dashboard, tools, officialMappResults] = await Promise.all([
    getIdentityDashboard(),
    getStudentTools(),
    getOfficialMappIdentityResults(),
  ]);
  const nonMappIdentityResults = dashboard.identityResults.filter((result) => result.kind !== "mapp");
  const allResults = [...officialMappResults, ...nonMappIdentityResults, ...dashboard.financeResults]
    .sort((left, right) => new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime());
  const completedKinds = new Set(allResults.map((result) => result.kind));
  return <IdentityExperience
    fullName={viewer.fullName || dashboard.profile.firstName || "Mon identité"}
    status={accountStatus(viewer.role, dashboard.profile.gender)}
    avatarUrl={viewer.avatarUrl}
    studentCount={dashboard.metrics.studentCount}
    months={monthsTogether(dashboard.profile.memberSince)}
    completedTests={allResults.length}
    stories={buildStories(tools)}
    results={allResults}
    upcoming={buildUpcoming(tools, completedKinds)}
  />;
}
