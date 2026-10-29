export const DEFAULT_OPPORTUNITY_EMOJI = "✨";

export function opportunityEmoji(value?: string | null) {
  const emoji = value?.trim();
  return emoji && [...emoji].length <= 16 ? emoji : DEFAULT_OPPORTUNITY_EMOJI;
}
