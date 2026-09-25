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

/** Mention de l'Église MLK dans le menu : « text » (mots sous le logo), « sigle » (le MLK seul) ou « complet » (le logo entier, à droite). */
const CHURCH_MARK: "text" | "sigle" | "complet" = "sigle";

/**
 * Version compacte pour l'en-tête du menu : pictos et « MINISTRY SCHOOL » sur fond encre,
 * avec la mention « Église MLK » dessous (en texte ou avec le logo de l'Église, voir CHURCH_MARK).
 */
export function LogoCompact({ priority = false, church = true }: { priority?: boolean; church?: boolean }) {
  const withLogo = church && CHURCH_MARK !== "text";
  const full = CHURCH_MARK === "complet";
  return (
    <div className={withLogo ? "flex items-center gap-3" : "flex flex-col items-center gap-1.5"}>
      <Image
        src="/logo-compact.png"
        alt="Ministry School"
        width={466}
        height={122}
        priority={priority}
        className={`h-auto select-none ${withLogo ? "w-[100px]" : "w-[136px]"}`}
      />
      {church &&
        (withLogo ? (
          <>
            {/* Trait de séparation, puis le logo de l'Église : même hauteur que les icônes + le nom (≈ 22 px pour un logo Ministry School de 100 px) */}
            <span aria-hidden="true" className="h-[22px] w-px bg-white/25" />
            <Image
              src={full ? "/logo-eglise-mlk-complet.png" : "/logo-mlk.png"}
              alt="Église MLK, Martin Luther King"
              width={full ? 355 : 370}
              height={full ? 119 : 285}
              className="h-[22px] w-auto select-none"
              // Le logo est noir sur transparent : on l'éclaircit pour le fond encre
              style={{ filter: "brightness(0) invert(92%) sepia(15%) saturate(520%) hue-rotate(337deg)", opacity: 0.9, transform: "translateY(1px)" }}
            />
          </>
        ) : (
          <span className="label text-[9px] leading-none tracking-[0.24em] text-[#d9c9ad]">ÉGLISE MLK</span>
        ))}
    </div>
  );
}
