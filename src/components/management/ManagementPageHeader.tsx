import type { ReactNode } from "react";

export default function ManagementPageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div className="min-w-0">
        {eyebrow && <p className="label text-[10px] tracking-[.16em] text-muted sm:text-xs">{eyebrow}</p>}
        <h1 className="font-title mt-1 break-words text-[clamp(1.75rem,7vw,2.35rem)] leading-[1.08] text-foreground">{title}</h1>
        {subtitle && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="management-page-actions flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">{actions}</div>}
    </header>
  );
}
