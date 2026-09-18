import MinistryPicto from "@/components/MinistryPicto";
import { getMinistry, INK } from "@/lib/ministry";

export type BarDatum = {
  label: string;
  value: number;
  /** Slug d'un ministère : la barre prend sa couleur et affiche son picto */
  slug?: string;
};

/**
 * Comparaison de magnitude sur une seule mesure, valeur à la pointe.
 * C'est le seul endroit où les cinq couleurs de ministère portent de l'information :
 * chaque barre prend la couleur de son ministère, doublée par son picto et son nom.
 */
export default function BarChart({
  title,
  subtitle,
  data,
  unit = "",
}: {
  title: string;
  subtitle?: string;
  data: BarDatum[];
  unit?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const hasPictos = data.some((d) => d.slug);
  const columns = hasPictos ? "grid-cols-[40px_150px_1fr_56px]" : "grid-cols-[150px_1fr_56px]";

  return (
    <section className="rounded-lg border border-border bg-background p-6">
      <h2 className="label text-xs tracking-[0.18em] text-muted">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}

      {total === 0 ? (
        <p className="mt-4 text-sm text-muted">Aucune donnée pour l&apos;instant.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {data.map((d) => {
            const color = getMinistry(d.slug)?.color ?? INK;
            return (
              <li key={d.label} className={`grid ${columns} items-center gap-3`}>
                {hasPictos && (
                  <span className="flex justify-center">
                    <MinistryPicto slug={d.slug} size={24} />
                  </span>
                )}

                <span className="truncate text-[15px] text-foreground" title={d.label}>
                  {d.label}
                </span>

                {/* Piste discrète + barre pleine, extrémité arrondie côté valeur */}
                <span className="h-3 w-full rounded-sm bg-[#f2ede3]" aria-hidden="true">
                  <span
                    className="block h-3"
                    style={{
                      width: `${(d.value / max) * 100}%`,
                      background: color,
                      borderRadius: "0 3px 3px 0",
                      minWidth: d.value > 0 ? "4px" : "0",
                    }}
                  />
                </span>

                <span className="font-title text-right tabular-nums text-[19px] text-foreground">
                  {d.value}
                  {unit}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
