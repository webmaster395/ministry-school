import { Sparkles } from "lucide-react";
import { opportunityEmoji, opportunityEmojis } from "@/lib/opportunity-banner";

export default function OpportunityEmojiPicker({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  const emojis = opportunityEmojis(value);
  return (
    <section className="overflow-hidden rounded-2xl border border-[#E9B85D]/45 bg-[linear-gradient(135deg,#FFFBF0,#FFF4D6)] shadow-[0_10px_30px_rgba(116,70,18,.06)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E9B85D]/30 px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#F4A12A] text-white"><Sparkles size={16} /></span>
          <div><p className="text-sm font-semibold text-foreground">Identité visuelle</p><p className="text-xs text-muted">Le repère affiché sur la bannière</p></div>
        </div>
        <span className="rounded-full border border-[#E9B85D]/50 bg-white/70 px-3 py-1 text-[11px] font-semibold text-[#8B571B]">1 ou 2 emojis</span>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-[112px_minmax(0,1fr)] sm:items-center sm:p-5">
        <div className="flex h-24 items-center justify-center rounded-2xl bg-[#202927] shadow-inner" aria-label={`Aperçu : ${opportunityEmoji(value)}`}>
          <div className="flex -space-x-3">
            {emojis.map((emoji, index) => <span key={`${emoji}-${index}`} className="grid h-14 w-14 place-items-center rounded-full border-[3px] border-[#202927] bg-white/15 text-[31px] shadow-sm" style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}>{emoji}</span>)}
          </div>
        </div>
        <label className="block min-w-0">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[.1em] text-[#7B5A2E]">Vos emojis</span>
          <input
            type="text"
            name="banner_emoji"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            maxLength={32}
            inputMode="text"
            autoComplete="off"
            placeholder="Ex. 🚀  ou  🤝🌍"
            aria-label="Emojis de la bannière"
            className="min-h-12 w-full rounded-xl border border-[#D9B06A] bg-white px-4 text-lg outline-none transition placeholder:text-sm placeholder:text-muted focus:border-[#E98720] focus:ring-4 focus:ring-[#F4A12A]/15"
          />
          <p className="mt-2 text-xs leading-relaxed text-muted">Saisissez ou collez jusqu’à deux emojis. Leur style s’adapte automatiquement à l’appareil.</p>
        </label>
      </div>
    </section>
  );
}
