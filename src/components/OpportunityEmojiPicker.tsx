import { OPPORTUNITY_EMOJIS } from "@/lib/opportunity-banner";

export default function OpportunityEmojiPicker({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-foreground">Emoji de la bannière</legend>
      <input type="hidden" name="banner_emoji" value={value} />
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Choisir l’emoji de la bannière">
        {OPPORTUNITY_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            role="radio"
            aria-checked={value === emoji}
            aria-label={`Choisir ${emoji}`}
            onClick={() => onChange(emoji)}
            className={`grid h-12 w-12 place-items-center rounded-xl border text-[25px] transition hover:-translate-y-0.5 ${value === emoji ? "border-[#E77B1A] bg-[#FFF1C5] shadow-sm ring-2 ring-[#F4A12A]/25" : "border-border bg-background hover:border-[#F4A12A]"}`}
            style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}
          >
            {emoji}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">L’emoji reprend le style natif de l’appareil, notamment Apple sur iPhone, iPad et Mac.</p>
    </fieldset>
  );
}
