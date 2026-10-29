export const DEFAULT_OPPORTUNITY_EMOJI = "✨";

export function opportunityEmojis(value?: string | null) {
  const input = value?.trim() || DEFAULT_OPPORTUNITY_EMOJI;
  const segmenter = new Intl.Segmenter("fr", { granularity: "grapheme" });
  return [...segmenter.segment(input)].map(({ segment }) => segment).filter((segment) => segment.trim()).slice(0, 2);
}

export function opportunityEmoji(value?: string | null) {
  return opportunityEmojis(value).join("") || DEFAULT_OPPORTUNITY_EMOJI;
}
