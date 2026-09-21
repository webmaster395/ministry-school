import { getMinistry } from "@/lib/ministry";

/** Formes vectorielles des cinq pictos (viewBox 100×100), nettes à toutes les tailles. */
export const PICTO_SHAPES: Record<string, React.ReactNode> = {
  // Pastoral : la croix
  pasteur: (
    <>
      <rect x="39" y="6" width="22" height="88" />
      <rect x="14" y="30" width="72" height="22" />
    </>
  ),
  // Évangélique : l'arche
  evangeliste: <path d="M14 94V50a36 36 0 0 1 72 0v44H64V50a14 14 0 0 0-28 0v44Z" />,
  // Doctoral : le livre ouvert
  docteur: (
    <>
      <path d="M47 24C38 14 22 12 8 14v58c14-2 30 0 39 10V24Z" />
      <path d="M53 24c9-10 25-12 39-10v58c-14-2-30 0-39 10V24Z" />
      <path d="M8 78c12-2 28 0 39 10 11-10 27-12 39-10v6c-12-2-28 0-39 10C36 84 20 82 8 84Z" />
    </>
  ),
  // Apostolique : trois personnes
  apotre: (
    <>
      <circle cx="50" cy="38" r="13" />
      <path d="M26 90c0-16 10-28 24-28s24 12 24 28Z" />
      <circle cx="22" cy="30" r="10" />
      <path d="M3 72c0-13 7-23 19-23 3 0 6 1 8 2-5 5-8 12-8 21Z" />
      <circle cx="78" cy="30" r="10" />
      <path d="M97 72c0-13-7-23-19-23-3 0-6 1-8 2 5 5 8 12 8 21Z" />
    </>
  ),
  // Prophétique : la colombe
  prophete: (
    <>
      <ellipse cx="50" cy="60" rx="27" ry="14" transform="rotate(-12 50 60)" />
      <circle cx="79" cy="46" r="10" />
      <path d="M87 42l12 5-12 5Z" />
      <path d="M28 64L2 80l6-16 22-8Z" />
      <path d="M36 54C28 32 40 12 72 6c-7 12-7 26-1 42Z" />
    </>
  ),
};

/** Picto d'un ministère, à partir de son slug. Ne rend rien si le ministère est inconnu. */
export default function MinistryPicto({
  slug,
  size = 20,
  className = "",
}: {
  slug: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const ministry = getMinistry(slug);
  if (!ministry || !PICTO_SHAPES[ministry.slug]) return null;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill={ministry.color}
      aria-hidden="true"
      className={`shrink-0 select-none ${className}`}
    >
      {PICTO_SHAPES[ministry.slug]}
    </svg>
  );
}
