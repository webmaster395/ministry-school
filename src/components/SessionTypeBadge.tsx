export default function SessionTypeBadge({ type }: { type: "commun" | "ministere" }) {
  if (type !== "commun") return null;

  return (
    <span className="label rounded-full border border-foreground/20 bg-foreground/[0.06] px-2.5 py-0.5 text-[11px] tracking-[0.12em] text-foreground">
      Tronc commun
    </span>
  );
}
