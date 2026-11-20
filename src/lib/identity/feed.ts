import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getStudentTools, type CatalogApp } from "@/lib/apps/catalog";
import { getIdentityDashboard, type IdentityDashboard } from "@/lib/identity/dashboard";
import { getPublishedHeroesMotorsResult, type HeroesMotorsResult } from "@/lib/identity/heroes-motors";

export type IdentityTool = Pick<CatalogApp, "id" | "slug" | "name" | "iconUrl" | "url">;

export type StudentIdentityFeed = {
  dashboard: IdentityDashboard;
  lifeLine: { completedAt: string } | null;
  heroesMotors: HeroesMotorsResult | null;
  tools: IdentityTool[];
};

export type GraceIdentityAssessment = {
  test_key: "fruit" | "gifts" | "skills";
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

type FeedToolRow = Omit<IdentityTool, "url"> & { destinationUrl: string };
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
    })),
  };
}

async function legacyIdentityFeed(userId: string): Promise<StudentIdentityFeed> {
  const supabase = await createClient();
  const [dashboard, tools, lifeLine, heroesMotors] = await Promise.all([
    getIdentityDashboard(),
    getStudentTools(),
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

export async function getStudentIdentityFeed(userId: string): Promise<StudentIdentityFeed> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("student_identity_feed");
  if (!error && data && typeof data === "object") return mapPayload(data as unknown as FeedPayload);

  // Permet un déploiement applicatif sans interruption pendant la courte fenêtre
  // où la migration additive n'est pas encore appliquée.
  if (error?.code === "PGRST202" || error?.code === "42883") return legacyIdentityFeed(userId);
  throw new Error(`Chargement de Mon identité impossible : ${error?.message ?? "réponse vide"}`);
}

export async function getGraceIdentityToolData(userId: string, superAdmin: boolean): Promise<GraceIdentityToolData> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("student_grace_identity_tool");
  if (!error && data && typeof data === "object") return data as unknown as GraceIdentityToolData;

  if (error?.code === "PGRST202" || error?.code === "42883") {
    const [app, assessments] = await Promise.all([
      superAdmin
        ? import("@/lib/apps/catalog").then(({ getCatalogAppBySlug }) => getCatalogAppBySlug("je-suis-par-la-grace-de-dieu"))
        : getStudentTools().then((tools) => tools.find((tool) => tool.slug === "je-suis-par-la-grace-de-dieu") ?? null),
      supabase.from("grace_identity_assessments").select("test_key,answers,results,completed_at,updated_at").eq("user_id", userId),
    ]);
    return {
      allowed: Boolean(app) || superAdmin,
      studentVisible: Boolean(app?.studentVisible),
      assessments: (assessments.data ?? []) as GraceIdentityAssessment[],
    };
  }
  throw new Error(`Chargement de l’outil impossible : ${error?.message ?? "réponse vide"}`);
}
