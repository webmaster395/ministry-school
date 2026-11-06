import { z } from "zod";
import { MAPP_DISPLAY_CASE_KEYS, MAPP_PAGE_KEYS, MAPP_PROFILE_CODES } from "./consolidated-v4-schema";

const nonEmpty = z.string().min(1);
const opaqueRecord = z.record(z.string(), z.unknown());

const questionnaireItemSchema = z
  .object({
    externalKey: z.string().regex(/^[NP]\d{2}$/),
    text: nonEmpty,
    section: z.enum(["natural", "under_pressure"]),
    dimension: z.enum(MAPP_PROFILE_CODES).nullable(),
    inverted: z.boolean(),
    weight: z.number().positive(),
    sourceOrder: z.number().int().min(1).max(50),
    order: z.number().int().min(1).max(50),
  })
  .strict();

const questionnaireSourceSchema = z
  .object({
    questionnaire: z
      .object({ code: nonEmpty, name: nonEmpty, version: z.literal(3), status: nonEmpty })
      .strict(),
    scoring: z.object({ code: nonEmpty, version: z.number().int().positive() }).strict(),
    publicationRules: opaqueRecord,
    answerScale: z.array(z.object({ value: z.number().int().min(1).max(5), label: nonEmpty }).strict()).length(5),
    questions: z.array(questionnaireItemSchema).length(50),
    scoringSpecification: z
      .object({
        natural: opaqueRecord,
        under_pressure: opaqueRecord,
        classification: opaqueRecord,
      })
      .strict(),
    pilotNotes: z.array(nonEmpty),
  })
  .strict();

export const integralV10Schema = z
  .object({
    packageSchema: z.literal("mapp-complete-editorial-v10"),
    publicationAllowed: z.boolean(),
    reviewStatus: nonEmpty,
    editorialLibrary: opaqueRecord,
    questionnaireSource: questionnaireSourceSchema,
    sourcePolicy: opaqueRecord,
    editorialDecisions: opaqueRecord,
    editorialRelease: opaqueRecord,
    featureActivation: z
      .object({
        generalPressureEditorial: z.object({ approved: z.boolean(), enabled: z.boolean(), page: nonEmpty, source: nonEmpty }).strict(),
        individualPressureScoring: z.object({ requested: z.boolean(), enabled: z.boolean(), requiredAction: nonEmpty }).strict(),
        individualPressureInterpretation: z.object({ requested: z.boolean(), enabled: z.boolean(), requiredAction: nonEmpty }).strict(),
        tieBreaker: z.object({ editoriallyApproved: z.boolean(), enabled: z.boolean(), requiredAction: nonEmpty }).strict(),
      })
      .strict(),
    integrationContract: opaqueRecord,
  })
  .strict()
  .superRefine((pkg, ctx) => {
    const library = pkg.editorialLibrary;
    const profiles = library.profiles as Record<string, { pages?: Record<string, unknown> }> | undefined;
    const combinations = library.orientedCombinations as Record<string, unknown> | undefined;
    const interactions = library.orientedInteractions as Record<string, unknown> | undefined;
    const cases = library.displayCases as Record<string, unknown> | undefined;
    const biblical = library.biblical as { profiles?: Record<string, { episodes?: unknown[] }> } | undefined;
    if (library.schemaVersion !== "mapp-editorial-consolidated-v10" || library.contentVersion !== 10) {
      ctx.addIssue({ code: "custom", path: ["editorialLibrary"], message: "Expected consolidated editorial library V10" });
    }
    if (!profiles || Object.keys(profiles).sort().join() !== [...MAPP_PROFILE_CODES].sort().join()) {
      ctx.addIssue({ code: "custom", path: ["editorialLibrary", "profiles"], message: "Expected exactly four profile keys" });
    } else {
      for (const code of MAPP_PROFILE_CODES) {
        if (Object.keys(profiles[code].pages ?? {}).join() !== MAPP_PAGE_KEYS.join()) {
          ctx.addIssue({ code: "custom", path: ["editorialLibrary", "profiles", code, "pages"], message: "Expected the six ordered result pages" });
        }
      }
    }
    if (Object.keys(combinations ?? {}).length !== 12) ctx.addIssue({ code: "custom", path: ["editorialLibrary", "orientedCombinations"], message: "Expected 12 combinations" });
    if (Object.keys(interactions ?? {}).length !== 16) ctx.addIssue({ code: "custom", path: ["editorialLibrary", "orientedInteractions"], message: "Expected 16 interactions" });
    if (Object.keys(cases ?? {}).sort().join() !== [...MAPP_DISPLAY_CASE_KEYS].sort().join()) ctx.addIssue({ code: "custom", path: ["editorialLibrary", "displayCases"], message: "Expected the 15 display cases" });
    const episodeCount = Object.values(biblical?.profiles ?? {}).reduce((sum, profile) => sum + (profile.episodes?.length ?? 0), 0);
    if (episodeCount !== 24) ctx.addIssue({ code: "custom", path: ["editorialLibrary", "biblical"], message: "Expected 24 biblical episodes" });

    const questions = pkg.questionnaireSource.questions;
    const keys = questions.map((question) => question.externalKey);
    const expected = [
      ...Array.from({ length: 40 }, (_, index) => `N${String(index + 1).padStart(2, "0")}`),
      ...Array.from({ length: 10 }, (_, index) => `P${String(index + 1).padStart(2, "0")}`),
    ];
    if (new Set(keys).size !== 50 || expected.some((key) => !keys.includes(key))) {
      ctx.addIssue({ code: "custom", path: ["questionnaireSource", "questions"], message: "Expected unique N01-N40 and P01-P10 question keys" });
    }
    if (new Set(questions.map((question) => question.order)).size !== 50 || new Set(questions.map((question) => question.sourceOrder)).size !== 50) {
      ctx.addIssue({ code: "custom", path: ["questionnaireSource", "questions"], message: "Question order and sourceOrder must each be unique" });
    }
    const natural = questions.filter((question) => question.section === "natural");
    const pressure = questions.filter((question) => question.section === "under_pressure");
    if (natural.length !== 40 || pressure.length !== 10) {
      ctx.addIssue({ code: "custom", path: ["questionnaireSource", "questions"], message: "Expected 40 natural and 10 pressure questions" });
    }
    if (pressure.some((question) => question.dimension !== null)) {
      ctx.addIssue({ code: "custom", path: ["questionnaireSource", "questions"], message: "Pressure dimensions must remain null until scoring is validated" });
    }
    if (pkg.questionnaireSource.scoringSpecification.under_pressure.status !== "not_validated") {
      ctx.addIssue({ code: "custom", path: ["questionnaireSource", "scoringSpecification", "under_pressure"], message: "V10 pressure scoring must remain not_validated" });
    }
  });

export type IntegralV10 = z.infer<typeof integralV10Schema>;
