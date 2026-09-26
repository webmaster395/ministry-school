import { ClipboardList } from "lucide-react";

/**
 * Carte d'information pratique de la première journée (3 octobre), à la place de tout devoir :
 * ce qu'il faut prévoir et ce qui n'est pas proposé sur place.
 */
export default function FirstDayCard() {
  return (
    <section className="rounded-lg border border-border bg-background p-6 sm:p-7">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-foreground">
          <ClipboardList size={21} strokeWidth={1.6} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="font-title text-[22px] leading-tight text-foreground">
            À préparer
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Pour profiter pleinement de cette première journée Ministry School, pensez à :
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-foreground">
            <li>apporter de quoi prendre des notes ;</li>
            <li>prévoir une bouteille d&apos;eau ;</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
