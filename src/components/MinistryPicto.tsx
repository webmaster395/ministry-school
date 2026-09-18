import Image from "next/image";
import { getMinistry } from "@/lib/ministry";

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
  if (!ministry) return null;

  return (
    <Image
      src={ministry.picto}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={`shrink-0 select-none object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
