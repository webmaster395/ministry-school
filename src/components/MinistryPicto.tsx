import { getMinistry } from "@/lib/ministry";

/**
 * Picto d'un ministère, à partir de son slug : les mêmes dessins que sur la landing
 * (découpés depuis /landing/ministry-icons-transparent.png, dans /public/pictos).
 * Ne rend rien si le ministère est inconnu.
 */
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
  if (!ministry) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- petit picto décoratif, next/image n'apporte rien ici
    <img
      src={`/pictos/${ministry.slug}.png`}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`inline-block shrink-0 select-none object-contain ${className}`}
    />
  );
}
