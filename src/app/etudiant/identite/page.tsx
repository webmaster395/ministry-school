import { getStudentTools, type CatalogApp } from "@/lib/apps/catalog";
import { getViewer } from "@/lib/data/viewer";
import { getIdentityDashboard } from "@/lib/identity/dashboard";
import IdentityExperience, { type IdentityStoryGroup, type IdentityStoryItem } from "./IdentityExperience";
import { GuestMappAutoClaim } from "./GuestMappAutoClaim";
import { getGuestCredential } from "@/lib/mapp/guest";
import { redirect } from "next/navigation";

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
    if (tool.slug === "generopoly") finance.push(...toolItems(tool));
    if (tool.slug === "profil-mapp" || tool.slug === "je-suis-par-la-grace-de-dieu") identity.push(...toolItems(tool));
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
  const [dashboard, tools, guestMapp] = await Promise.all([getIdentityDashboard(), getStudentTools(), getGuestCredential()]);
  const allResults = [...dashboard.identityResults, ...dashboard.financeResults]
    .sort((left, right) => new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime());
  const completedKinds = new Set(allResults.map((result) => result.kind));
  const seenKinds = new Set<string>();
  const results = allResults.filter((result) => {
    if (seenKinds.has(result.kind)) return false;
    seenKinds.add(result.kind);
    return true;
  });
  return <>{guestMapp ? <GuestMappAutoClaim /> : null}<IdentityExperience
    fullName={viewer.fullName || dashboard.profile.firstName || "Mon identité"}
    status={accountStatus(viewer.role, dashboard.profile.gender)}
    avatarUrl={viewer.avatarUrl}
    studentCount={dashboard.metrics.studentCount}
    months={monthsTogether(dashboard.profile.memberSince)}
    completedTests={dashboard.metrics.completedTests}
    stories={buildStories(tools, dashboard.recommendations)}
    results={results}
    upcoming={buildUpcoming(tools, completedKinds)}
  /></>;
}
