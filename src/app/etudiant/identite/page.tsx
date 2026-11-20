import { getCatalogApps, getStudentTools, type CatalogApp } from "@/lib/apps/catalog";
import { getViewer } from "@/lib/data/viewer";
import { getIdentityDashboard } from "@/lib/identity/dashboard";
import { getOfficialMappIdentityResults } from "@/lib/mapp/official-results";
import IdentityExperience, { type IdentityFeedItem, type IdentityStoryItem, type IdentityTodoItem } from "./IdentityExperience";
import { isMappGuestOpen } from "@/lib/mapp/access-window";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { IdentityResult } from "@/lib/identity/dashboard";
import { getPublishedHeroesMotorsResult } from "@/lib/identity/heroes-motors";
import { graceIdentitySlug, graceIdentityToolSlugs, graceTestKeyFromSlug } from "@/lib/apps/grace-identity";

export const dynamic = "force-dynamic";

const selectedFruitStoryImage = "/apps/grace-identity/fruit-spirit-blue-violet-grape-story-v26.png";
const selectedFruitPostImage = "/apps/grace-identity/fruit-spirit-blue-violet-grape-post-v26.png";

function selectedFruitImage(configuredImage: string | null | undefined, selectedImage: string) {
  if (!configuredImage) return selectedImage;
  if (
    configuredImage.startsWith("/apps/grace-identity/fruit-spirit-") &&
    configuredImage !== selectedFruitStoryImage &&
    configuredImage !== selectedFruitPostImage
  ) return selectedImage;
  return configuredImage;
}

function latestResult(results: IdentityResult[], kind: IdentityResult["kind"]) {
  return results.find((result) => result.kind === kind);
}

const controlledResultKinds = new Set<IdentityResult["kind"]>(["mapp", "fruit", "gifts", "skills", "generopoly", "apest", "life-line", "heroes-motors"]);

type ToolProgress = {
  app_id: string;
  first_opened_at: string | null;
  last_opened_at: string | null;
  reset_at: string | null;
};

const importanceOrder: Record<CatalogApp["identityImportance"], number> = {
  priority: 0,
  recommended: 1,
  optional: 2,
};

function providerKinds(tool: CatalogApp): IdentityResult["kind"][] {
  const configured = tool.resultProvider;
  if (configured === "mapp" || configured === "fruit" || configured === "gifts" || configured === "skills" || configured === "generopoly" || configured === "apest" || configured === "life-line" || configured === "heroes-motors") return [configured];
  const graceKind = graceTestKeyFromSlug(tool.slug);
  if (graceKind) return [graceKind];
  if (tool.slug === "profil-mapp") return ["mapp"];
  if (tool.slug === "test-des-heros") return ["heroes-motors"];
  if (tool.slug === "ma-ligne-de-vie") return ["life-line"];
  if (tool.slug.includes("apest")) return ["apest"];
  return [];
}

function wasOpenedAfterReset(progress: ToolProgress | undefined) {
  if (!progress?.last_opened_at) return false;
  return !progress.reset_at || new Date(progress.last_opened_at).getTime() > new Date(progress.reset_at).getTime();
}

function buildStories({
  tools,
  results,
  heroesAvailable,
}: {
  tools: CatalogApp[];
  results: IdentityResult[];
  heroesAvailable: boolean;
}): IdentityStoryItem[] {
  const hasTool = (slug: string) => tools.some((tool) => tool.slug === slug);
  const items: IdentityStoryItem[] = [];
  const mapp = latestResult(results, "mapp");
  const mappQuery = new URLSearchParams();
  if (mapp?.resultRevisionId) mappQuery.set("revision", mapp.resultRevisionId);
  if (mapp?.native) mappQuery.set("native", "1");
  if (mapp?.legacy) mappQuery.set("legacy", "1");
  const mappHref = mapp?.attemptId
    ? `/apps/profil-mapp/test/${mapp.attemptId}/resultat${mappQuery.size ? `?${mappQuery.toString()}` : ""}`
    : "/apps/profil-mapp";

  if (hasTool("profil-mapp")) {
    items.push({
      key: "profil-mapp",
      name: "Profil MAPP",
      category: "Identité",
      href: mappHref,
      image: "/identity/stories/identity-v2.webp",
      status: mapp ? "completed" : "not-started",
      measurable: true,
    });
  }

  if (heroesAvailable) {
    items.push({
      key: "heroes-motors",
      name: "Test des héros",
      category: "Identité",
      href: "/etudiant/identite/mes-moteurs",
      image: "/identity/heroes/dove-abstract-v1.webp",
      status: "completed",
      measurable: true,
    });
  }

  const legacyGraceTool = tools.find((tool) => tool.slug === graceIdentitySlug);
  ([
    ["fruit", "Fruit de l’Esprit", selectedFruitStoryImage],
    ["gifts", "Dons spirituels", "/identity/posts/dons-spirituels.webp"],
    ["skills", "Compétences naturelles", "/identity/posts/competences-naturelles.webp"],
  ] as const).forEach(([kind, fallbackName, fallbackImage]) => {
      const tool = tools.find((candidate) => candidate.slug === graceIdentityToolSlugs[kind]) ?? legacyGraceTool;
      if (!tool || (!tool.placementStory && tool.slug !== graceIdentitySlug)) return;
      const completed = latestResult(results, kind);
      items.push({
        key: kind,
        name: tool.storyTitle || fallbackName,
        category: "Identité",
        href: tool.storyDestinationUrl || graceTestHref(kind),
        image: kind === "fruit"
          ? selectedFruitImage(tool.storyImageUrl, fallbackImage)
          : tool.storyImageUrl || fallbackImage,
        status: completed ? "completed" : "not-started",
        measurable: true,
      });
    });

  if (hasTool("ma-ligne-de-vie")) {
    const lifeLine = latestResult(results, "life-line");
    items.push({
      key: "life-line",
      name: "Ma ligne de vie",
      category: "Identité",
      href: "/etudiant/ligne-de-vie",
      image: "/identity/posts/ligne-de-vie.webp",
      status: lifeLine ? "completed" : "not-started",
      measurable: true,
    });
  }

  return items;
}

function monthsTogether(memberSince: string | null) {
  if (!memberSince) return 0;
  const start = new Date(memberSince);
  const now = new Date();
  if (Number.isNaN(start.getTime()) || start > now) return 0;

  // Le mois de démarrage compte comme le premier mois du parcours. Ainsi, un
  // étudiant déjà inscrit au moment de sa première formation voit « 1 mois »
  // au lieu de zéro, sans ajouter de mois aux comptes dont le parcours n'a pas
  // encore commencé.
  return (
    (now.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    now.getUTCMonth() -
    start.getUTCMonth() +
    1
  );
}

function accountStatus(gender: "homme" | "femme" | null | undefined) {
  return gender === "femme" ? "Aimée" : gender === "homme" ? "Aimé" : "Aimé·e";
}

function graceTestHref(kind: "fruit" | "gifts" | "skills") {
  return {
    fruit: "/etudiant/identite/fruit-de-lesprit",
    gifts: "/etudiant/identite/dons-spirituels",
    skills: "/etudiant/identite/competences-naturelles",
  }[kind];
}

function buildTodoItems(tools: CatalogApp[], completedKinds: Set<string>, progressByApp: Map<string, ToolProgress>) {
  const items = tools.flatMap<IdentityTodoItem>((tool) => {
    if (!tool.placementPost) return [];
    const completed = providerKinds(tool).some((kind) => completedKinds.has(kind));
    if (completed) return [];

    const external = tool.toolType === "external";
    if (!external && tool.identityResultMode === "none") return [];
    if (external && tool.identityResultMode !== "automatic" && wasOpenedAfterReset(progressByApp.get(tool.id))) return [];

    const graceKind = graceTestKeyFromSlug(tool.slug);
    const href = external ? `/etudiant/outils/${tool.slug}/ouvrir` : tool.postDestinationUrl || tool.url;
    return [{
      key: tool.id,
      appId: tool.id,
      name: tool.postTitle || tool.displayTitle,
      description: tool.postDescription,
      href: graceKind && !external ? graceTestHref(graceKind) : href,
      imageUrl: tool.postImageUrl || tool.iconUrl || "/identity/stories/identity-v2.webp",
      category: tool.category || "Identité",
      importance: tool.identityImportance,
      order: tool.postOrder,
      external,
    }];
  });

  return items.sort((left, right) =>
    importanceOrder[left.importance] - importanceOrder[right.importance]
    || left.order - right.order
    || left.name.localeCompare(right.name, "fr"),
  );
}

export default async function StudentIdentityPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.deactivated) redirect("/auth/desactive");
  if (!viewer.roles.superAdmin && !isMappGuestOpen()) redirect("/etudiant");
  const supabase = await createClient();
  const [dashboard, tools, officialMappResults, lifeLine, heroesMotors, progress] = await Promise.all([
    getIdentityDashboard(),
    viewer.roles.superAdmin
      ? getCatalogApps({ includeUnpublished: true, includeArchived: false, channel: "admin" })
      : getStudentTools(),
    getOfficialMappIdentityResults(),
    supabase.from("life_line_journeys").select("events,reflection,completed_at,updated_at").eq("user_id", viewer.id).maybeSingle(),
    getPublishedHeroesMotorsResult(viewer.id),
    supabase.from("app_user_progress").select("app_id,first_opened_at,last_opened_at,reset_at").eq("user_id", viewer.id),
  ]);
  // La création de la ligne de vie est déjà une réalisation personnelle : elle
  // doit être retrouvable depuis Identité, même si certains champs sont restés
  // volontairement vides ou si elle a été enregistrée avant ce correctif.
  const hasLifeLineContent = Boolean(lifeLine.data);
  const lifeLineResults: IdentityResult[] = hasLifeLineContent
    ? [{ kind: "life-line", completedAt: lifeLine.data?.completed_at ?? lifeLine.data?.updated_at ?? new Date().toISOString() }]
    : [];
  const nativeMappResults = dashboard.identityResults
    .filter((result) => result.kind === "mapp")
    .map((result) => ({ ...result, native: true }));
  const selectedMappResults = [
    ...nativeMappResults,
    ...officialMappResults.map((result) => ({ ...result, legacy: true })),
  ]
    .filter((result, index, results) => !result.attemptId || results.findIndex((candidate) => candidate.attemptId === result.attemptId) === index)
    .sort((left, right) => new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime());
  const nonMappIdentityResults = dashboard.identityResults.filter((result) => result.kind !== "mapp");
  const heroesResults: IdentityResult[] = heroesMotors
    ? [{ kind: "heroes-motors", completedAt: heroesMotors.publishedAt }]
    : [];
  const chronologicalResults = [...selectedMappResults, ...nonMappIdentityResults, ...dashboard.financeResults, ...lifeLineResults, ...heroesResults]
    .sort((left, right) => new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime());
  // Mes moteurs devient la publication éditoriale épinglée lorsqu'un véritable
  // résultat a été publié. MAPP reste ensuite la première publication de test.
  const allResults = [
    ...chronologicalResults.filter((result) => result.kind === "heroes-motors"),
    ...chronologicalResults.filter((result) => result.kind === "mapp"),
    ...chronologicalResults.filter((result) => result.kind !== "mapp" && result.kind !== "heroes-motors"),
  ];
  const visibleTools = tools;
  const accessibleResultKinds = new Set(visibleTools.flatMap(providerKinds));
  const visibleResults = allResults.filter((result) => !controlledResultKinds.has(result.kind) || accessibleResultKinds.has(result.kind));
  const completedKinds = new Set(visibleResults.map((result) => result.kind));
  const progressByApp = new Map(((progress.data ?? []) as ToolProgress[]).map((item) => [item.app_id, item]));
  const todoItems = buildTodoItems(visibleTools, completedKinds, progressByApp);
  const feed: IdentityFeedItem[] = [
    ...todoItems.map((todo) => ({ type: "todo" as const, key: `todo-${todo.key}`, todo })),
    ...visibleResults.map((result) => ({
      type: "result" as const,
      key: `result-${result.kind}-${result.attemptId ?? result.completedAt}`,
      result,
    })),
  ];
  const stories = buildStories({
    tools: visibleTools,
    results: visibleResults,
    heroesAvailable: Boolean(heroesMotors),
  });
  const defaultPostArtwork = {
    fruit: { title: "Fruit de l’Esprit", image: selectedFruitPostImage, href: graceTestHref("fruit") },
    gifts: { title: "Dons spirituels", image: "/identity/posts/dons-spirituels.webp", href: graceTestHref("gifts") },
    skills: { title: "Compétences naturelles", image: "/identity/posts/competences-naturelles.webp", href: graceTestHref("skills") },
  };
  const legacyGraceTool = visibleTools.find((tool) => tool.slug === graceIdentitySlug);
  const toolArtwork = Object.fromEntries(((["fruit", "gifts", "skills"] as const)).map((kind) => {
    const tool = visibleTools.find((candidate) => candidate.slug === graceIdentityToolSlugs[kind]) ?? legacyGraceTool;
    const fallback = defaultPostArtwork[kind];
    return [kind, {
      title: tool?.postTitle || fallback.title,
      image: kind === "fruit"
        ? selectedFruitImage(tool?.postImageUrl, fallback.image)
        : tool?.postImageUrl || fallback.image,
      href: tool?.postDestinationUrl || fallback.href,
    }];
  }));
  return <IdentityExperience
    userId={viewer.id}
    fullName={viewer.fullName || dashboard.profile.firstName || "Mon identité"}
    status={accountStatus(dashboard.profile.gender)}
    avatarUrl={viewer.avatarUrl}
    studentCount={dashboard.metrics.studentCount}
    months={monthsTogether(dashboard.profile.memberSince)}
    completedTests={visibleResults.length}
    stories={stories}
    feed={feed}
    toolArtwork={toolArtwork}
  />;
}
