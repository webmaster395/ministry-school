import React from "react";

export function LogoMark({
  size = 48,
  className = "",
  variant = "monochrome", // "monochrome" (black on light) | "white" (white on dark)
}: {
  size?: number;
  className?: string;
  variant?: "monochrome" | "white";
}) {
  return (
    <LogoImage
      size={size}
      className={className}
      invert={variant === "white"}
    />
  );
}

export function LogoImage({
  size = 56,
  className = "",
  invert = false,
}: {
  size?: number;
  className?: string;
  invert?: boolean;
}) {
  return (
    <img
      src="/logo-icon.png"
      alt="Ministry School Logo"
      width={size}
      height={size}
      className={`object-contain select-none pointer-events-none ${
        invert ? "brightness-0 invert" : ""
      } ${className}`}
      style={{ width: size, height: size }}
      loading="eager"
    />
  );
}

export default function Logo({
  size = 36,
  variant = "full", // "full" | "mark" | "stacked"
  colorTheme = "dark", // "dark" | "white"
}: {
  size?: number;
  variant?: "full" | "mark" | "stacked";
  colorTheme?: "dark" | "white";
}) {
  const isWhite = colorTheme === "white";

  if (variant === "mark") {
    return <LogoMark size={size} variant={isWhite ? "white" : "monochrome"} />;
  }

  if (variant === "stacked") {
    return (
      <div className="flex flex-col items-center text-center select-none">
        <div className="mb-2.5 p-2 rounded-2xl bg-white shadow-sm border border-slate-200">
          <LogoImage size={size} />
        </div>

        {/* MINISTRY */}
        <h2
          className={`text-xl font-bold uppercase tracking-[0.2em] ${
            isWhite ? "text-white" : "text-slate-900"
          }`}
          style={{ fontFamily: "var(--font-cinzel), serif" }}
        >
          Ministry
        </h2>

        {/* SCHOOL */}
        <div className="flex items-center gap-2 my-1 w-full justify-center opacity-80">
          <div className={`h-[1px] w-5 ${isWhite ? "bg-white/40" : "bg-slate-400"}`} />
          <span
            className={`text-xs font-semibold tracking-[0.32em] uppercase ${
              isWhite ? "text-slate-200" : "text-slate-700"
            }`}
          >
            School
          </span>
          <div className={`h-[1px] w-5 ${isWhite ? "bg-white/40" : "bg-slate-400"}`} />
        </div>

        {/* Devise */}
        <p
          className={`text-[0.62rem] tracking-[0.2em] uppercase font-medium mt-0.5 ${
            isWhite ? "text-slate-300" : "text-slate-500"
          }`}
        >
          Grandir • Servir • Impacter
        </p>
      </div>
    );
  }

  // Variant "full" (horizontal)
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className="p-1 rounded-lg bg-white shadow-xs border border-slate-200">
        <LogoImage size={size} />
      </div>
      <div className="leading-tight">
        <p
          className={`text-sm font-bold uppercase tracking-[0.14em] ${
            isWhite ? "text-white" : "text-slate-900"
          }`}
          style={{ fontFamily: "var(--font-cinzel), serif" }}
        >
          Ministry
        </p>
        <p
          className={`text-[0.6rem] uppercase tracking-[0.26em] font-semibold ${
            isWhite ? "text-slate-300" : "text-slate-500"
          }`}
        >
          School
        </p>
      </div>
    </div>
  );
}
