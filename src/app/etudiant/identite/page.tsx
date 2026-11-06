import { getStudentTools, type CatalogApp } from "@/lib/apps/catalog";
import { getViewer } from "@/lib/data/viewer";
import { getIdentityDashboard } from "@/lib/identity/dashboard";
import IdentityExperience, { type IdentityStoryGroup, type IdentityStoryItem } from "./IdentityExperience";

export const dynamic = "force-dynamic";

function toolItems(tool: CatalogApp): IdentityStoryItem[] {
  if (tool.slug === "je-suis-par-la-grace-de-dieu") return [
    { key: `${tool.id}-fruit`, name: "Fruits de l’Esprit", href: tool.url, iconUrl: tool.iconUrl },
    { key: `${tool.id}-gifts`, name: "Dons spirituels", href: tool.url, iconUrl: tool.iconUrl },
    { key: `${tool.id}-skills`, name: "Compétences naturelles", href: tool.url, iconUrl: tool.iconUrl },
  ];
  return [{ key: tool.id, name: tool.name, href: tool.url, iconUrl: tool.iconUrl }];
}

function buildStories(tools: CatalogApp[], recommendations: Array<{ id: string; title: string; href: string }>): IdentityStoryGroup[] {
  const identity: IdentityStoryItem[] = [];
  const finance: IdentityStoryItem[] = [];
  for (const tool of tools) {
    const category = tool.category.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (category.includes("finance") || tool.slug === "generopoly") finance.push(...toolItems(tool));
    else identity.push(...toolItems(tool));
  }
  const groups: IdentityStoryGroup[] = [
    { key: "identity", label: "Identité", image: "/identity/stories/identity.webp", items: identity },
    { key: "finance", label: "Finance", image: "/identity/stories/finance.webp", items: finance },
    { key: "recommendations", label: "Recommandations", image: "/identity/stories/recommendations.webp", items: recommendations.map((item) => ({ key: item.id, name: item.title, href: item.href, iconUrl: null })) },
  ];
  return groups.filter((group) => group.items.length > 0);
}

function monthsTogether(memberSince: string | null) {
  if (!memberSince) return 0;
  const start = new Date(memberSince);
  const now = new Date();
  return Math.max(0, (now.getUTCFullYear() - start.getUTCFullYear()) * 12 + now.getUTCMonth() - start.getUTCMonth());
}

export default async function StudentIdentityPage() {
  const [viewer, dashboard, tools] = await Promise.all([getViewer(), getIdentityDashboard(), getStudentTools()]);
  const firstName = dashboard.profile.firstName || viewer?.fullName.split(" ")[0] || "Mon identité";
  return <IdentityExperience
    firstName={firstName}
    avatarUrl={viewer?.avatarUrl ?? null}
    gender={dashboard.profile.gender ?? null}
    certified={dashboard.profile.certified}
    studentCount={dashboard.metrics.studentCount}
    months={monthsTogether(dashboard.profile.memberSince)}
    completedTests={dashboard.metrics.completedTests}
    stories={buildStories(tools, dashboard.recommendations)}
    results={[...dashboard.identityResults, ...dashboard.financeResults]}
  />;
}
