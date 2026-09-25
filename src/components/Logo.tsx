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

/** Mention de l'Église MLK sous le logo du menu : « text » (mots) ou « logo » (l'image de l'Église). */
const CHURCH_MARK: "text" | "logo" = "logo";

/**
 * Version compacte pour l'en-tête du menu : pictos et « MINISTRY SCHOOL » sur fond encre,
 * avec la mention « Église MLK » dessous (en texte ou avec le logo de l'Église, voir CHURCH_MARK).
 */
export function LogoCompact({ priority = false, church = true }: { priority?: boolean; church?: boolean }) {
  const withLogo = church && CHURCH_MARK === "logo";
  return (
    <div className={withLogo ? "flex items-center gap-3" : "flex flex-col items-center gap-1.5"}>
      <Image
        src="/logo-compact.png"
        alt="Ministry School"
        width={466}
        height={122}
        priority={priority}
        className={`h-auto select-none ${withLogo ? "w-[112px]" : "w-[136px]"}`}
      />
      {church &&
        (withLogo ? (
          <>
            {/* Petit trait de séparation, puis le logo de l'Église à droite de Ministry School */}
            <span aria-hidden="true" className="h-7 w-px bg-white/25" />
            <Image
              src="/logo-mlk.png"
              alt="Église MLK"
              width={370}
              height={285}
              className="h-[30px] w-auto select-none"
              // Le logo est noir sur transparent : on l'éclaircit pour le fond encre
              style={{ filter: "brightness(0) invert(92%) sepia(15%) saturate(520%) hue-rotate(337deg)", opacity: 0.9 }}
            />
          </>
        ) : (
          <span className="label text-[9px] leading-none tracking-[0.24em] text-[#d9c9ad]">ÉGLISE MLK</span>
        ))}
    </div>
  );
}
