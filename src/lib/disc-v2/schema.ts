import { z } from "zod";

const dimension = z.enum(["D", "I", "S", "C"]);
const code = z.enum(["D", "I", "S", "C", "N"]);

const naturalOption = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  plusCode: code,
  minusCode: code,
}).strict();

const naturalGroup = z.object({
  id: z.number().int().min(1).max(28),
  type: z.literal("forced_choice_plus_minus"),
  options: z.array(naturalOption).length(4),
  required: z.object({ most: z.literal(1), least: z.literal(1), distinct: z.literal(true) }).strict(),
}).strict();

const pressureQuestion = z.object({
  id: z.number().int().min(1).max(8),
  dimension,
  theme: z.string().min(1),
  text: z.string().min(1),
  required: z.literal(true),
}).strict();

const duel = z.object({
  id: z.string().regex(/^[DISC]-[DISC]$/),
  dimensions: z.tuple([dimension, dimension]),
  options: z.array(z.object({ dimension, text: z.string().min(1) }).strict()).length(2),
}).strict();

export const discV2Schema = z.object({
  schema_version: z.literal("2.0.0"),
  project: z.literal("Profil MAPP"),
  status: z.literal("verified_ready_for_integration_not_published"),
  change_summary: z.string(),
  profiles: z.record(dimension, z.string()),
  natural: z.object({
    instructions: z.string(),
    questions: z.array(naturalGroup).length(28),
    scoring: z.object({
      source: z.string(),
      source_numeric_codes: z.record(z.string(), code),
      dimensions: z.tuple([z.literal("D"), z.literal("I"), z.literal("S"), z.literal("C")]),
      neutral_code: z.literal("N"),
      plus_counts: z.string(),
      minus_counts: z.string(),
      net_counts: z.string(),
      rank_basis: z.string(),
      display_percentages: z.object({
        status: z.string(),
        positive_opportunities: z.object({ D: z.literal(27), I: z.literal(28), S: z.literal(26), C: z.literal(24) }),
        rate: z.string(), percentage: z.string(), zero_opportunity: z.string(), zero_total_rates: z.string(), rounding: z.string(), rank_independent: z.string(),
      }).strict(),
      neutral_handling: z.string(),
    }).strict(),
  }).strict(),
  pressure: z.object({
    instructions: z.string(),
    scale: z.array(z.object({ value: z.number().int().min(1).max(5), label: z.string().min(1) }).strict()).length(5),
    questions: z.array(pressureQuestion).length(8),
    scoring: z.object({ raw_sum: z.string(), intensity_0_100: z.string(), rank_basis: z.string(), share_100: z.string(), zero_denominator: z.string(), interpretation: z.string() }).strict(),
  }).strict(),
  tie_break: z.object({
    scope: z.string(), trigger: z.string(), one_duel_one_question: z.literal(true), duels: z.array(duel).length(6), algorithm: z.string(),
    max_duels: z.object({ two_way: z.literal(1), three_way: z.literal(3), four_way: z.literal(6) }).strict(),
    scores_unchanged: z.literal(true), note: z.string(), reuse: z.string(),
  }).strict(),
  definitions: z.record(z.string(), z.string()),
  ui: z.object({
    preserve_existing_hero: z.literal(true), preserve_existing_result_layout: z.literal(true), natural_chart: z.literal(true), pressure_chart: z.literal(true),
    pressure_chart_title: z.string(), same_profile_cards_for_ties: z.literal(true), show_tie_note_only_if_tiebreak: z.literal(true),
    tie_note_template_two: z.string(), tie_note_template_multi: z.string(), show_natural_primary_secondary: z.literal(true), show_pressure_primary_secondary: z.literal(true),
    mobile_info_icons: z.string(), no_tie_ui_redesign: z.literal(true),
  }).strict(),
  qa_tests: z.array(z.string()),
  validation_status: z.record(z.string(), z.string()),
  questionnaire_version: z.literal("disc-mapp-v2.0.0"),
  scoring_version: z.literal("disc-mapp-v2.0.0"),
  versioning: z.object({
    immutable: z.literal(true), preserve_historical_results: z.literal(true), historical_results: z.string(), save_with_each_result: z.array(z.string()), publication_gate: z.string(),
  }).strict(),
}).strict().superRefine((value, ctx) => {
  const groupIds = new Set<number>();
  let codeCount = 0;
  for (const [index, group] of value.natural.questions.entries()) {
    if (groupIds.has(group.id)) ctx.addIssue({ code: "custom", path: ["natural", "questions", index, "id"], message: "Identifiant de groupe dupliqué" });
    groupIds.add(group.id);
    if (group.id !== index + 1) ctx.addIssue({ code: "custom", path: ["natural", "questions", index, "id"], message: "Ordre des groupes invalide" });
    const optionIds = new Set(group.options.map((option) => option.id));
    if (optionIds.size !== 4) ctx.addIssue({ code: "custom", path: ["natural", "questions", index, "options"], message: "Identifiants d’option dupliqués" });
    codeCount += group.options.length * 2;
  }
  if (codeCount !== 224) ctx.addIssue({ code: "custom", path: ["natural", "questions"], message: "224 codes sont requis" });
  const pressureCounts = Object.fromEntries(["D", "I", "S", "C"].map((item) => [item, 0]));
  value.pressure.questions.forEach((question, index) => {
    if (question.id !== index + 1) ctx.addIssue({ code: "custom", path: ["pressure", "questions", index, "id"], message: "Ordre sous pression invalide" });
    pressureCounts[question.dimension] += 1;
  });
  for (const [key, count] of Object.entries(pressureCounts)) if (count !== 2) ctx.addIssue({ code: "custom", path: ["pressure", "questions"], message: `Deux affirmations sont requises pour ${key}` });
  const expectedPairs = new Set(["D-I", "D-S", "D-C", "I-S", "I-C", "S-C"]);
  for (const item of value.tie_break.duels) expectedPairs.delete(item.id);
  if (expectedPairs.size) ctx.addIssue({ code: "custom", path: ["tie_break", "duels"], message: "Les six paires de duel sont requises" });
});

export type DiscV2Package = z.infer<typeof discV2Schema>;
