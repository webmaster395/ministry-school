import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import { fruitTraits, spiritualGifts } from "@/lib/apps/grace-identity";
import { classifySpiritualGifts, isSpiritualGiftsV2Complete, spiritualGiftsV2 } from "@/lib/apps/spiritual-gifts-v2";

type AssessmentRow = {
  test_key: "fruit" | "gifts" | "skills";
  answers: unknown;
  completed_at: string | null;
  updated_at: string;
};

type ReviewRow = { response: unknown; submitted_at: string | null };
type Answers = Record<string, unknown>;

function object(value: unknown): Answers {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Answers : {};
}

function score(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 1 && number <= 5 ? number : null;
}

export type GraceIdentitySummary = {
  completed: Record<AssessmentRow["test_key"], number>;
  latestUpdate: string | null;
  fruitAverages: Array<{ name: string; value: number; count: number }>;
  giftResponses: Array<{ name: string; yes: number; explore: number; no: number }>;
  skills: Array<{ name: string; count: number }>;
  externalReviews: { created: number; completed: number };
};

export async function getGraceIdentitySummary(): Promise<GraceIdentitySummary> {
  const service = createServiceClient();
  const [{ data: assessments, error: assessmentsError }, { data: reviews, error: reviewsError }] = await Promise.all([
    service.from("grace_identity_assessments").select("test_key,answers,completed_at,updated_at"),
    service.from("grace_identity_skill_reviews").select("response,submitted_at"),
  ]);
  if (assessmentsError) throw new Error("Les autoévaluations n’ont pas pu être chargées.");
  if (reviewsError) throw new Error("Les évaluations externes n’ont pas pu être chargées.");
  const rows = (assessments ?? []) as AssessmentRow[];
  const byKey = (key: AssessmentRow["test_key"]) => rows.filter((row) => row.test_key === key);
  const fruit = byKey("fruit");
  const gifts = byKey("gifts");
  const skills = byKey("skills");
  const fruitAverages = fruitTraits.map((trait) => {
    const values = fruit.map((row) => score(object(row.answers)[trait.key])).filter((value): value is number => value !== null);
    return { name: trait.name, value: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0, count: values.length };
  });
  const giftResponses = spiritualGiftsV2.map((gift) => {
    const categories = gifts.map((row) => {
      const answers = object(row.answers);
      if (!isSpiritualGiftsV2Complete(answers)) return null;
      return classifySpiritualGifts(answers).find((item) => item.id === gift.id)?.category ?? null;
    });
    const legacy = spiritualGifts.find(([, name]) => name === gift.name);
    const legacyValues = legacy ? gifts.map((row) => String(object(row.answers)[legacy[0]] ?? "")) : [];
    return {
      name: gift.name,
      yes: categories.filter((value) => value === "exercised").length + legacyValues.filter((value) => value === "Oui").length,
      explore: categories.filter((value) => value === "developing").length + legacyValues.filter((value) => value === "Peut-être").length,
      no: categories.filter((value) => value === "less_visible").length + legacyValues.filter((value) => value === "Non").length,
    };
  });
  const skillCounts = new Map<string, number>();
  skills.forEach((row) => {
    const selected = object(row.answers).selected;
    if (!Array.isArray(selected)) return;
    new Set(selected.filter((item): item is string => typeof item === "string")).forEach((item) => skillCounts.set(item, (skillCounts.get(item) ?? 0) + 1));
  });
  const latestUpdate = rows.reduce<string | null>((latest, row) => !latest || row.updated_at > latest ? row.updated_at : latest, null);
  const reviewRows = (reviews ?? []) as ReviewRow[];
  return {
    completed: { fruit: fruit.length, gifts: gifts.length, skills: skills.length },
    latestUpdate,
    fruitAverages,
    giftResponses,
    skills: [...skillCounts.entries()].map(([name, count]) => ({ name, count })).sort((left, right) => right.count - left.count || left.name.localeCompare(right.name)).slice(0, 10),
    externalReviews: { created: reviewRows.length, completed: reviewRows.filter((row) => row.submitted_at && row.response).length },
  };
}
