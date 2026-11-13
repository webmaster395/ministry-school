import { getStudentTools, type CatalogApp } from "@/lib/apps/catalog";
import { getViewer } from "@/lib/data/viewer";
import { getIdentityDashboard } from "@/lib/identity/dashboard";
import { getOfficialMappIdentityResults } from "@/lib/mapp/official-results";
import IdentityExperience, { type IdentityStoryItem } from "./IdentityExperience";
import { isMappGuestOpen } from "@/lib/mapp/access-window";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { IdentityResult } from "@/lib/identity/dashboard";
import { getPublishedHeroesMotorsResult } from "@/lib/identity/heroes-motors";
import { graceIdentitySlug } from "@/lib/apps/grace-identity";

export const dynamic = "force-dynamic";

function latestResult(results: IdentityResult[], kind: IdentityResult["kind"]) {
  return results.find((result) => result.kind === kind);
}

const graceResultKinds = new Set<IdentityResult["kind"]>(["fruit", "gifts", "skills"]);

function buildStories({
  tools,
  results,
  heroesAvailable,
  graceAvailable,
}: {
  tools: CatalogApp[];
  results: IdentityResult[];
  heroesAvailable: boolean;
  graceAvailable: boolean;
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

  // MAPP reste l'accès principal de Mon identité, même pendant une mise à jour
  // de sa fiche catalogue. Son résultat officiel est déjà chargé plus haut.
  items.push({
    key: "profil-mapp",
    name: "Profil MAPP",
    category: "Identité",
    href: mappHref,
    image: "/identity/stories/identity-v2.webp",
    status: mapp ? "completed" : "not-started",
    measurable: true,
  });

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

  if (graceAvailable) {
    ([
      ["fruit", "Fruit de l’Esprit", "/apps/grace-identity/fruit-spirit-water-fruit-v9.png"],
      ["gifts", "Dons spirituels", "/identity/posts/dons-spirituels.webp"],
      ["skills", "Compétences naturelles", "/identity/posts/competences-naturelles.webp"],
    ] as const).forEach(([kind, name, image]) => {
      const completed = latestResult(results, kind);
      items.push({
        key: kind,
        name,
        category: "Identité",
        href: graceTestHref(kind),
        image,
        status: completed ? "completed" : "not-started",
        measurable: true,
      });
    });
  }

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

function resultKindForItem(item: { key: string }) {
  if (item.key.endsWith("-fruit") || item.key === "fruit") return "fruit";
  if (item.key.endsWith("-gifts") || item.key === "gifts") return "gifts";
  if (item.key.endsWith("-skills") || item.key === "skills") return "skills";
  return null;
}

function graceToolItems(tool: CatalogApp) {
  return [
    { key: `${tool.id}-fruit`, name: "Fruit de l’Esprit", href: graceTestHref("fruit"), iconUrl: tool.iconUrl },
    { key: `${tool.id}-gifts`, name: "Dons spirituels", href: graceTestHref("gifts"), iconUrl: tool.iconUrl },
    { key: `${tool.id}-skills`, name: "Compétences naturelles", href: graceTestHref("skills"), iconUrl: tool.iconUrl },
  ];
}

function graceTestHref(kind: "fruit" | "gifts" | "skills") {
  return {
    fruit: "/etudiant/identite/fruit-de-lesprit",
    gifts: "/etudiant/identite/dons-spirituels",
    skills: "/etudiant/identite/competences-naturelles",
  }[kind];
}

function buildUpcoming(tools: CatalogApp[], completedKinds: Set<string>) {
  return tools.flatMap((tool) => {
    if (tool.slug === "profil-mapp") return completedKinds.has("mapp") ? [] : [{ key: tool.id, name: "Profil MAPP", href: "/apps/profil-mapp", iconUrl: tool.iconUrl, category: "Identité" }];
    if (tool.slug === "je-suis-par-la-grace-de-dieu") return graceToolItems(tool).flatMap((item) => {
      const kind = resultKindForItem(item);
      return kind && !completedKinds.has(kind) ? [{ ...item, category: "Identité" }] : [];
    });
    if (tool.slug === "ma-ligne-de-vie") return completedKinds.has("life-line") ? [] : [{ key: tool.id, name: "Ma ligne de vie", href: tool.url, iconUrl: tool.iconUrl, category: "Identité" }];
    // Généropoly et le simulateur sont des ressources non suivables : ils sont
    // regroupés dans l'onglet Ressources et ne faussent pas la progression.
    if (tool.slug === "generopoly") return [];
    if (tool.slug.includes("apest")) return completedKinds.has("apest") ? [] : [{ key: tool.id, name: tool.name, href: tool.url, iconUrl: tool.iconUrl, category: "Identité" }];
    return [];
  });
}

export default async function StudentIdentityPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.deactivated) redirect("/auth/desactive");
  if (!viewer.roles.superAdmin && !isMappGuestOpen()) redirect("/etudiant");
  const supabase = await createClient();
  const [dashboard, tools, officialMappResults, lifeLine, heroesMotors] = await Promise.all([
    getIdentityDashboard(),
    getStudentTools(),
    getOfficialMappIdentityResults(),
    supabase.from("life_line_journeys").select("events,reflection,completed_at,updated_at").eq("user_id", viewer.id).maybeSingle(),
    getPublishedHeroesMotorsResult(viewer.id),
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
  const visibleTools = viewer.roles.superAdmin ? tools : tools.filter((tool) => tool.slug !== graceIdentitySlug);
  const visibleResults = viewer.roles.superAdmin ? allResults : allResults.filter((result) => !graceResultKinds.has(result.kind));
  const completedKinds = new Set(visibleResults.map((result) => result.kind));
  const graceAvailable = viewer.roles.superAdmin;
  const stories = buildStories({
    tools: visibleTools,
    results: visibleResults,
    heroesAvailable: Boolean(heroesMotors),
    graceAvailable,
  });
  return <IdentityExperience
    userId={viewer.id}
    fullName={viewer.fullName || dashboard.profile.firstName || "Mon identité"}
    status={accountStatus(dashboard.profile.gender)}
    avatarUrl={viewer.avatarUrl}
    studentCount={dashboard.metrics.studentCount}
    months={monthsTogether(dashboard.profile.memberSince)}
    completedTests={visibleResults.length}
    stories={stories}
    results={visibleResults}
    upcoming={buildUpcoming(visibleTools, completedKinds)}
  />;
}
