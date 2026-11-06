import { z } from "zod";

export const MAPP_PROFILE_CODES = [
  "conquerant",
  "communiquant",
  "facilitateur",
  "analyste",
] as const;

export const MAPP_PAGE_KEYS = [
  "01_identite",
  "02_fonctionnement",
  "03_forces_defis",
  "04_avec_les_autres",
  "05_grandir",
  "06_bible",
] as const;

export const MAPP_DISPLAY_CASE_KEYS = [
  "primary_unique_secondary_unique",
  "primary_tie_unresolved",
  "primary_tie_resolved_by_complement",
  "secondary_tie_unresolved",
  "secondary_tie_resolved_by_complement",
  "all_four_equal",
  "close_but_not_equal",
  "no_secondary",
  "classification_unavailable",
  "tie_breaker_incomplete",
  "pressure_answers_not_scored",
  "pressure_unique",
  "pressure_tied",
  "pressure_unavailable",
  "tie_breaker_optional",
] as const;

export const mappProfileCodeSchema = z.enum(MAPP_PROFILE_CODES);
export const mappPageKeySchema = z.enum(MAPP_PAGE_KEYS);
export const mappDisplayCaseKeySchema = z.enum(MAPP_DISPLAY_CASE_KEYS);

const publicationStatusSchema = z.enum([
  "draft",
  "review",
  "approved",
  "published",
  "blocked",
  "empty",
]);

const nonEmptyText = z.string().min(1);
const textArray = z.array(nonEmptyText);
const editorialRecord = z.record(z.string(), z.unknown());

const sectionSchema = z
  .object({
    title: nonEmptyText,
    paragraphs: textArray,
  })
  .strict();

const pressureEntrySchema = z
  .object({ number: nonEmptyText, title: nonEmptyText, body: nonEmptyText })
  .strict();

const profilePagesSchema = z
  .object({
    "01_identite": z
      .object({
        title: nonEmptyText,
        subtitle: nonEmptyText,
        signature: sectionSchema,
        characteristics: sectionSchema,
        combination: sectionSchema,
        publicationStatus: publicationStatusSchema,
      })
      .strict(),
    "02_fonctionnement": z
      .object({
        title: nonEmptyText,
        intro: nonEmptyText,
        feature: nonEmptyText,
        dimensions: z.array(editorialRecord).length(5),
        underPressure: z
          .object({
            title: nonEmptyText,
            introduction: textArray,
            possibleChanges: z.array(pressureEntrySchema),
            practicalAdjustments: z.array(pressureEntrySchema),
            closing: nonEmptyText,
            sectionNumber: nonEmptyText,
            heading: nonEmptyText,
            subheading: nonEmptyText,
            readingLabel: nonEmptyText,
            introDisclaimer: nonEmptyText,
            publicationStatus: publicationStatusSchema,
          })
          .strict(),
        publicationStatus: publicationStatusSchema,
      })
      .strict(),
    "03_forces_defis": z
      .object({
        title: nonEmptyText,
        intro: nonEmptyText,
        strengths: z.array(editorialRecord),
        watchpoints: z.array(editorialRecord),
        publicationStatus: publicationStatusSchema,
      })
      .strict(),
    "04_avec_les_autres": z
      .object({
        title: nonEmptyText,
        intro: nonEmptyText,
        communication: sectionSchema,
        collaboration: sectionSchema,
        interactions: nonEmptyText,
        publicationStatus: publicationStatusSchema,
      })
      .strict(),
    "05_grandir": z
      .object({
        title: nonEmptyText,
        intro: nonEmptyText,
        actions: z.array(editorialRecord),
        reflectionQuestions: textArray,
        publicationStatus: publicationStatusSchema,
      })
      .strict(),
    "06_bible": z
      .object({
        title: nonEmptyText,
        contentRef: nonEmptyText,
        sharedConclusionRef: nonEmptyText,
        publicationStatus: publicationStatusSchema,
      })
      .strict(),
  })
  .strict();

const profileSchema = z
  .object({
    code: mappProfileCodeSchema,
    name: nonEmptyText,
    biblicalFigure: nonEmptyText,
    color: nonEmptyText,
    hero: editorialRecord,
    pages: profilePagesSchema,
    landscapeAsset: nonEmptyText,
    publicationStatus: publicationStatusSchema,
  })
  .strict();

const quoteSchema = z
  .object({
    text: nonEmptyText,
    reference: nonEmptyText,
    translation: nonEmptyText,
    youVersionUrl: z.string().url().optional(),
    fullPassageUrl: z.string().url().optional(),
    excerpt: z.boolean().optional(),
    placement: nonEmptyText.optional(),
    followup: nonEmptyText.optional(),
    status: nonEmptyText.optional(),
  })
  .strict();

const episodeSchema = z
  .object({
    id: nonEmptyText,
    order: z.number().int().min(1).max(6),
    publicationStatus: publicationStatusSchema,
    characteristic: nonEmptyText,
    title: nonEmptyText,
    story: nonEmptyText,
    profileReading: nonEmptyText,
    takeaway: nonEmptyText,
    references: textArray,
    scriptureQuote: quoteSchema.optional(),
    scriptureQuotes: z.array(quoteSchema).optional(),
  })
  .strict();

const biblicalProfileSchema = z
  .object({
    profileCode: mappProfileCodeSchema,
    profileName: nonEmptyText,
    biblicalFigure: nonEmptyText,
    publicationStatus: publicationStatusSchema,
    title: nonEmptyText,
    introduction: nonEmptyText,
    episodes: z.array(episodeSchema).length(6),
    whatYouMayHaveInCommon: editorialRecord,
    closing: editorialRecord,
  })
  .strict();

const combinationSchema = z
  .object({
    primary: mappProfileCodeSchema,
    secondary: mappProfileCodeSchema,
    title: nonEmptyText,
    subtitle: nonEmptyText,
    pages: z
      .object({
        "01_identite": editorialRecord,
        "02_fonctionnement": editorialRecord,
        "03_forces_defis": editorialRecord,
        "04_avec_les_autres": editorialRecord,
        "05_grandir": editorialRecord,
        "06_bible": editorialRecord,
      })
      .strict(),
    publicationStatus: publicationStatusSchema,
  })
  .strict();

const interactionSchema = z
  .object({
    source: mappProfileCodeSchema,
    target: mappProfileCodeSchema,
    title: nonEmptyText,
    whatHelps: nonEmptyText,
    whatYouMayAppreciate: nonEmptyText,
    possibleMisunderstanding: nonEmptyText,
    request: nonEmptyText,
    feedback: nonEmptyText,
    disagreement: nonEmptyText,
    jointDecision: nonEmptyText,
    practicalTip: nonEmptyText,
    publicationStatus: publicationStatusSchema,
  })
  .strict();

const profilesShape = Object.fromEntries(
  MAPP_PROFILE_CODES.map((code) => [code, profileSchema]),
) as Record<(typeof MAPP_PROFILE_CODES)[number], typeof profileSchema>;
const biblicalProfilesShape = Object.fromEntries(
  MAPP_PROFILE_CODES.map((code) => [code, biblicalProfileSchema]),
) as Record<(typeof MAPP_PROFILE_CODES)[number], typeof biblicalProfileSchema>;
const displayCasesShape = Object.fromEntries(
  MAPP_DISPLAY_CASE_KEYS.map((key) => [key, editorialRecord]),
) as Record<(typeof MAPP_DISPLAY_CASE_KEYS)[number], typeof editorialRecord>;

export const consolidatedV4Schema = z
  .object({
    schemaVersion: z.literal("mapp-editorial-consolidated-v4"),
    contentVersion: z.literal(4),
    locale: z.literal("fr-FR"),
    release: z
      .object({
        status: z.literal("review"),
        title: nonEmptyText,
        publicationAllowed: z.literal(false),
        notes: nonEmptyText,
      })
      .strict(),
    contentPolicy: editorialRecord,
    pageOrder: z.tuple(MAPP_PAGE_KEYS.map((key) => z.literal(key)) as [z.ZodLiteral<string>, ...z.ZodLiteral<string>[]]),
    profiles: z.object(profilesShape).strict(),
    orientedCombinations: z.record(z.string(), combinationSchema),
    orientedInteractions: z.record(z.string(), interactionSchema),
    displayCases: z.object(displayCasesShape).strict(),
    presentationRules: editorialRecord,
    biblical: z
      .object({
        profiles: z.object(biblicalProfilesShape).strict(),
        sharedJesusSection: editorialRecord,
      })
      .strict(),
    tieBreaker: editorialRecord,
    contentReview: editorialRecord,
    sourceProvenance: textArray,
  })
  .strict()
  .superRefine((library, ctx) => {
    const combinations = Object.entries(library.orientedCombinations);
    if (combinations.length !== 12) {
      ctx.addIssue({ code: "custom", path: ["orientedCombinations"], message: "Expected exactly 12 oriented combinations" });
    }
    for (const [key, value] of combinations) {
      if (key !== `${value.primary}__${value.secondary}` || value.primary === value.secondary) {
        ctx.addIssue({ code: "custom", path: ["orientedCombinations", key], message: "Combination key must be primary__secondary with distinct profiles" });
      }
    }
    const interactions = Object.entries(library.orientedInteractions);
    if (interactions.length !== 16) {
      ctx.addIssue({ code: "custom", path: ["orientedInteractions"], message: "Expected exactly 16 oriented interactions" });
    }
    for (const [key, value] of interactions) {
      if (key !== `${value.source}__${value.target}`) {
        ctx.addIssue({ code: "custom", path: ["orientedInteractions", key], message: "Interaction key must be source__target" });
      }
    }
    for (const code of MAPP_PROFILE_CODES) {
      const profile = library.profiles[code];
      const biblical = library.biblical.profiles[code];
      if (profile.code !== code || biblical.profileCode !== code) {
        ctx.addIssue({ code: "custom", path: ["profiles", code], message: "Profile keys and embedded codes must match" });
      }
      const orders = biblical.episodes.map((episode) => episode.order).sort();
      if (new Set(biblical.episodes.map((episode) => episode.id)).size !== 6 || orders.join(",") !== "1,2,3,4,5,6") {
        ctx.addIssue({ code: "custom", path: ["biblical", "profiles", code, "episodes"], message: "Episodes need unique ids and orders 1 through 6" });
      }
      for (const episode of biblical.episodes) {
        for (const reference of episode.references) {
          if (!reference.split("·").every((part) => /\d+\s*:\s*\d+/.test(part))) {
            ctx.addIssue({ code: "custom", path: ["biblical", "profiles", code, "episodes", episode.order - 1, "references"], message: `Invalid chapter:verse reference: ${reference}` });
          }
        }
      }
    }
  });

export type ConsolidatedV4 = z.infer<typeof consolidatedV4Schema>;
export type MappProfileCode = z.infer<typeof mappProfileCodeSchema>;
export type MappDisplayCaseKey = z.infer<typeof mappDisplayCaseKeySchema>;
