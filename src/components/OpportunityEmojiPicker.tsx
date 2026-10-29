export default function OpportunityEmojiPicker({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-foreground">Emoji de la bannière</span>
      <div className="flex max-w-md items-center gap-3 rounded-2xl border border-border bg-background p-3 focus-within:border-[#F4A12A] focus-within:ring-2 focus-within:ring-[#F4A12A]/15">
        <span
          aria-hidden="true"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#FFF1C5] text-[27px]"
          style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}
        >
          {value || "✨"}
        </span>
        <input
          type="text"
          name="banner_emoji"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={16}
          inputMode="text"
          autoComplete="off"
          placeholder="Saisir ou coller un emoji"
          aria-label="Emoji de la bannière"
          className="min-h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
        />
      </div>
      <p className="mt-2 text-xs text-muted">L’emoji reprend le style natif de l’appareil, notamment Apple sur iPhone, iPad et Mac.</p>
    </label>
  );
}
