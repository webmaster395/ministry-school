import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";
import { naturalSkillCategories, spiritualGifts, type GraceTestKey } from "@/lib/apps/grace-identity";
import { calculateFruitSpiritV2, FRUIT_SPIRIT_QUESTIONNAIRE_VERSION, FRUIT_SPIRIT_SCORING_VERSION, fruitSpiritQuestionIdsV2, isFruitSpiritV2Complete, validFruitSpiritAnswer } from "@/lib/apps/fruit-spirit-v2";
import { classifySpiritualGifts, isSpiritualGiftsV2Complete } from "@/lib/apps/spiritual-gifts-v2";
import { naturalSkillIds } from "@/lib/apps/natural-skills-v2";

const keys = new Set<GraceTestKey>(["fruit", "gifts", "skills"]);
const knownSkills = new Set<string>(naturalSkillCategories.flatMap((category) => category.skills));
const assessmentVersions: Record<GraceTestKey, { questionnaire: string; scoring: string; restitution: string | null }> = {
  fruit: { questionnaire: FRUIT_SPIRIT_QUESTIONNAIRE_VERSION, scoring: FRUIT_SPIRIT_SCORING_VERSION, restitution: null },
  gifts: { questionnaire: "spiritual-gifts-current", scoring: "spiritual-gifts-current", restitution: "spiritual-gifts-current" },
  skills: { questionnaire: "natural-skills-current", scoring: "natural-skills-current", restitution: "natural-skills-current" },
};

function fruitAnswers(answers: Record<string, unknown>) {
  return Object.fromEntries(fruitSpiritQuestionIdsV2.flatMap((questionId) => validFruitSpiritAnswer(answers[questionId]) ? [[questionId, Number(answers[questionId])]] : []));
}

function resultsFor(testKey: GraceTestKey, answers: Record<string, unknown>) {
  if (testKey === "fruit") return calculateFruitSpiritV2(answers);
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
  const strengths = Array.isArray(answers.strengths) ? answers.strengths.filter((item): item is string => typeof item === "string" && naturalSkillIds.has(item)) : [];
  const growth = Array.isArray(answers.growth) ? answers.growth.filter((item): item is string => typeof item === "string" && naturalSkillIds.has(item)) : [];
  const priorities = Array.isArray(answers.priorities) ? answers.priorities.filter((item): item is string => typeof item === "string" && naturalSkillIds.has(item) && growth.includes(item)).slice(0, 3) : [];
  return { version: "natural-skills-v2-48", strengths, growth, priorities, legacySelected: selected };
}

export async function PUT(request: Request) {
  const viewer = await getViewer();
  if (!viewer || viewer.deactivated) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  const body = await request.json().catch(() => null) as { testKey?: string; answers?: unknown; completed?: unknown } | null;
  if (!body || !keys.has(body.testKey as GraceTestKey) || !body.answers || typeof body.answers !== "object" || Array.isArray(body.answers)) return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  const testKey = body.testKey as GraceTestKey;
  const rawAnswers = body.answers as Record<string, unknown>;
  const answers = testKey === "fruit" ? fruitAnswers(rawAnswers) : rawAnswers;
  const completed = testKey === "fruit" ? body.completed === true : true;
  if (testKey === "fruit" && completed && !isFruitSpiritV2Complete(answers)) return NextResponse.json({ error: "Les 27 réponses sont nécessaires pour terminer le questionnaire." }, { status: 400 });
  const results = resultsFor(testKey, answers);
  const version = assessmentVersions[testKey];
  const supabase = await createClient();
  const { data, error } = await supabase.from("grace_identity_assessments").upsert({
    user_id: viewer.id,
    test_key: testKey,
    questionnaire_version: version.questionnaire,
    scoring_version: version.scoring,
    restitution_version: version.restitution,
    answers,
    results,
    completed_at: completed ? new Date().toISOString() : null,
  }, { onConflict: "user_id,test_key,questionnaire_version" }).select("test_key,questionnaire_version,scoring_version,restitution_version,answers,results,completed_at,updated_at").single();
  if (error) return NextResponse.json({ error: "Les réponses n’ont pas pu être enregistrées." }, { status: 500 });
  return NextResponse.json({ record: data });
}
