export const OPPORTUNITY_EMOJIS = [
  "✨", "🎯", "🚀", "🌱", "🤝", "💡", "🎨", "🎤",
  "🧭", "🛠️", "📚", "❤️", "🙌", "🌍", "🏆", "🔥",
] as const;

export const DEFAULT_OPPORTUNITY_EMOJI = "✨";

export function opportunityEmoji(value?: string | null) {
  return OPPORTUNITY_EMOJIS.includes(value as (typeof OPPORTUNITY_EMOJIS)[number])
    ? value!
    : DEFAULT_OPPORTUNITY_EMOJI;
}
