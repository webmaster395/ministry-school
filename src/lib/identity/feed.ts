import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getStudentTools, type CatalogApp } from "@/lib/apps/catalog";
import { getIdentityDashboard, type IdentityDashboard } from "@/lib/identity/dashboard";
import { getPublishedHeroesMotorsResult, type HeroesMotorsResult } from "@/lib/identity/heroes-motors";

export type IdentityTool = Pick<CatalogApp,
  | "id" | "slug" | "name" | "iconUrl" | "url" | "destinationUrl"
  | "displayTitle" | "storyTitle" | "storyImageUrl" | "storyDestinationUrl"
  | "postTitle" | "postImageUrl" | "postDestinationUrl"
  | "placementStory" | "placementWork"
>;

export type StudentIdentityFeed = {
  dashboard: IdentityDashboard;
  lifeLine: { completedAt: string } | null;
  heroesMotors: HeroesMotorsResult | null;
  tools: IdentityTool[];
};

export type GraceIdentityAssessment = {
  test_key: "fruit" | "gifts" | "skills";
  questionnaire_version: string;
  scoring_version: string;
  restitution_version: string | null;
  answers: Record<string, unknown>;
  results: Record<string, unknown>;
  completed_at: string | null;
  updated_at: string;
};

export type GraceIdentityToolData = {
  allowed: boolean;
  studentVisible: boolean;
  assessments: GraceIdentityAssessment[];
};

type FeedToolRow = Omit<IdentityTool, "url">;
type FeedPayload = Omit<StudentIdentityFeed, "tools"> & { tools?: FeedToolRow[] };

const ministryAppUrls: Record<string, string> = {
  generopoly: "/apps/generopoly",
  "profil-mapp": "/apps/profil-mapp",
  "je-suis-par-la-grace-de-dieu": "/etudiant/identite",
  "ma-ligne-de-vie": "/etudiant/ligne-de-vie",
};

function mapPayload(payload: FeedPayload): StudentIdentityFeed {
  return {
    dashboard: payload.dashboard,
    lifeLine: payload.lifeLine ?? null,
    heroesMotors: payload.heroesMotors ?? null,
    tools: (payload.tools ?? []).map((tool) => ({
      id: tool.id,
      slug: tool.slug,
      name: tool.name,
      iconUrl: tool.iconUrl,
      url: ministryAppUrls[tool.slug] ?? tool.destinationUrl,
      destinationUrl: tool.destinationUrl,
      displayTitle: tool.displayTitle,
      storyTitle: tool.storyTitle,
      storyImageUrl: tool.storyImageUrl,
      storyDestinationUrl: tool.storyDestinationUrl,
      postTitle: tool.postTitle,
      postImageUrl: tool.postImageUrl,
      postDestinationUrl: tool.postDestinationUrl,
      placementStory: tool.placementStory,
      placementWork: tool.placementWork,
    })),
  };
}

async function legacyIdentityFeed(userId: string, superAdmin: boolean): Promise<StudentIdentityFeed> {
  const supabase = await createClient();
  const [dashboard, tools, lifeLine, heroesMotors] = await Promise.all([
    getIdentityDashboard(),
    superAdmin
      ? import("@/lib/apps/catalog").then(({ getCatalogApps }) => getCatalogApps({ includeUnpublished: true, includeArchived: false, channel: "admin" }))
      : getStudentTools(),
    supabase.from("life_line_journeys").select("completed_at,updated_at").eq("user_id", userId).maybeSingle(),
    getPublishedHeroesMotorsResult(userId),
  ]);
  return {
    dashboard,
    tools,
    lifeLine: lifeLine.data ? { completedAt: lifeLine.data.completed_at ?? lifeLine.data.updated_at } : null,
    heroesMotors,
  };
}

export async function getStudentIdentityFeed(userId: string, superAdmin = false): Promise<StudentIdentityFeed> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("student_identity_feed");
  if (!error && data && typeof data === "object") return mapPayload(data as unknown as FeedPayload);

  // Permet un déploiement applicatif sans interruption pendant la courte fenêtre
  // où la migration additive n'est pas encore appliquée.
  if (error?.code === "PGRST202" || error?.code === "42883") return legacyIdentityFeed(userId, superAdmin);
  throw new Error(`Chargement de Mon identité impossible : ${error?.message ?? "réponse vide"}`);
}

export async function getGraceIdentityToolData(userId: string, superAdmin: boolean, testKey: GraceIdentityAssessment["test_key"]): Promise<GraceIdentityToolData> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("student_grace_identity_tool", { p_test_key: testKey });
  if (!error && data && typeof data === "object") return data as unknown as GraceIdentityToolData;

  if (error?.code === "PGRST202" || error?.code === "42883") {
    const [app, assessments] = await Promise.all([
      superAdmin
        ? import("@/lib/apps/catalog").then(({ getCatalogAppBySlug }) => getCatalogAppBySlug("je-suis-par-la-grace-de-dieu"))
        : getStudentTools().then((tools) => tools.find((tool) => ["je-suis-par-la-grace-de-dieu", "fruit-de-lesprit", "dons-spirituels", "competences-naturelles"].includes(tool.slug)) ?? null),
      supabase.from("grace_identity_assessments").select("test_key,questionnaire_version,scoring_version,restitution_version,answers,results,completed_at,updated_at").eq("user_id", userId),
    ]);
    return {
      allowed: Boolean(app) || superAdmin,
      studentVisible: Boolean(app?.studentVisible),
      assessments: (assessments.data ?? []) as GraceIdentityAssessment[],
    };
  }
  throw new Error(`Chargement de l’outil impossible : ${error?.message ?? "réponse vide"}`);
}
