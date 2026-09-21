import Image from "next/image";

/** L'ovale complet de la charte : pictos, wordmark et cinq sensibilités. */
export function LogoLockup({
  className = "",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/logo-lockup.png"
      alt="Ministry School — Pastoral, prophétique, doctoral, évangélique, apostolique"
      width={947}
      height={502}
      priority={priority}
      className={`h-auto w-full select-none ${className}`}
    />
  );
}

export default LogoLockup;

/** Version compacte pour l'en-tête du menu : pictos et « MINISTRY SCHOOL » sur fond encre. */
export function LogoCompact({ priority = false }: { priority?: boolean }) {
  return (
    <Image
      src="/logo-compact.png"
      alt="Ministry School"
      width={466}
      height={122}
      priority={priority}
      className="h-auto w-[172px] select-none"
    />
  );
}
