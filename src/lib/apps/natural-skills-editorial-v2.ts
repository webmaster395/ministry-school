import editorialData from "./natural-skills-editorial-v2.json";

export type NaturalSkillEditorialMode = "strength" | "growth" | "both";

export type NaturalSkillEditorialVariant = {
  contribution: string;
  service_examples: string[];
  progression: string;
  mentor: string;
  seven_day_challenge: string;
  next_weeks_goal: string;
};

export type NaturalSkillEditorialEntry = {
  editorial_id: string;
  name: string;
  strength: NaturalSkillEditorialVariant;
  growth: NaturalSkillEditorialVariant;
  both: NaturalSkillEditorialVariant;
};

export const naturalSkillsEditorial = editorialData as Record<string, NaturalSkillEditorialEntry>;

export function getNaturalSkillEditorial(skillId: string, mode: NaturalSkillEditorialMode) {
  return naturalSkillsEditorial[skillId]?.[mode];
}
