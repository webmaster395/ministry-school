import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";
import { fruitTraits, naturalSkillCategories, spiritualGifts, type GraceTestKey } from "@/lib/apps/grace-identity";
import { classifySpiritualGifts, isSpiritualGiftsV2Complete } from "@/lib/apps/spiritual-gifts-v2";

const keys = new Set<GraceTestKey>(["fruit", "gifts", "skills"]);
const knownSkills = new Set<string>(naturalSkillCategories.flatMap((category) => category.skills));

function resultsFor(testKey: GraceTestKey, answers: Record<string, unknown>) {
  if (testKey === "fruit") return { scores: Object.fromEntries(fruitTraits.map((trait) => [trait.key, Number(answers[trait.key]) || 0])) };
  if (testKey === "gifts") {
    if (isSpiritualGiftsV2Complete(answers)) {
      return {
        version: "spiritual-gifts-v3-21",
        gifts: classifySpiritualGifts(answers).map(({ id, name, category, average, strongestDimension }) => ({ id, name, category, average, strongestDimension })),
      };
    }
    return { yes: spiritualGifts.filter(([key]) => answers[key] === "Oui").map(([, label]) => label), explore: spiritualGifts.filter(([key]) => answers[key] === "Peut-être").map(([, label]) => label) };
  }
  const selected = Array.isArray(answers.selected) ? answers.selected.filter((item): item is string => typeof item === "string" && knownSkills.has(item)) : [];
  return { selected };
}

export async function PUT(request: Request) {
  const viewer = await getViewer();
  if (!viewer || viewer.deactivated) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  const body = await request.json().catch(() => null) as { testKey?: string; answers?: unknown } | null;
  if (!body || !keys.has(body.testKey as GraceTestKey) || !body.answers || typeof body.answers !== "object" || Array.isArray(body.answers)) return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  const testKey = body.testKey as GraceTestKey;
  const answers = body.answers as Record<string, unknown>;
  const results = resultsFor(testKey, answers);
  const supabase = await createClient();
  const { data, error } = await supabase.from("grace_identity_assessments").upsert({
    user_id: viewer.id,
    test_key: testKey,
    answers,
    results,
    completed_at: new Date().toISOString(),
  }, { onConflict: "user_id,test_key" }).select("test_key,answers,results,completed_at,updated_at").single();
  if (error) return NextResponse.json({ error: "Les réponses n’ont pas pu être enregistrées." }, { status: 500 });
  return NextResponse.json({ record: data });
}
