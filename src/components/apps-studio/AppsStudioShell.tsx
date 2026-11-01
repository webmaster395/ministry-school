import Link from "next/link";
import { ArrowLeft, Presentation } from "lucide-react";
/* eslint-disable @next/next/no-img-element -- icônes du catalogue à domaine dynamique */

type StudioTab = "applications" | "results";
type AppTab = "results" | "editor" | "settings";

export default function AppsStudioShell({
  children,
  active,
  appTab,
  appSlug = "generopoly",
  appName = "Généropoly",
  appIconUrl = "/apps/generopoly.png",
  hasResults = true,
  hasEditor = true,
}: {
  children: React.ReactNode;
  active: StudioTab;
  appTab?: AppTab;
  appSlug?: string;
  appName?: string;
  appIconUrl?: string | null;
  hasResults?: boolean;
  hasEditor?: boolean;
}) {
  return <div data-tools-section={active}>
      {appTab && (
        <section className="mb-7 border-b border-border pb-1">
          <Link href="/admin/apps" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground"><ArrowLeft size={14} /> Gestion des outils</Link>
          <div className="mt-4 flex items-center gap-3">{appIconUrl ? <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-background"><img src={appIconUrl} alt="" className="h-full w-full object-contain" /></span> : <span className="grid h-11 w-11 place-items-center rounded-xl bg-background font-title text-xl">{appName.slice(0, 1)}</span>}<h1 className="font-title text-3xl font-normal sm:text-4xl">{appName}</h1></div>
          <nav className="mt-5 flex gap-2 overflow-x-auto pb-4" aria-label={`Navigation ${appName}`}>
            <AppLink href={`/admin/apps/${appSlug}/settings`} active={appTab === "settings"}>Paramètres</AppLink>
            {hasResults && <AppLink href={`/admin/apps/${appSlug}/results`} active={appTab === "results"}>Résultats</AppLink>}
            {hasEditor && <AppLink href={`/admin/apps/${appSlug}/editor`} active={appTab === "editor"}>Édition</AppLink>}
            {appSlug === "generopoly" && <Link aria-label={`Projeter les résultats de ${appName}`} className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-full bg-[#20302e] px-4 py-2 text-sm font-semibold text-[#fbeeda]" href="/admin/apps/generopoly/projection" target="_blank"><Presentation size={15} /> Projeter</Link>}
          </nav>
        </section>
      )}
      {children}
    </div>;
}

function AppLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return <Link className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${active ? "bg-[#e8eeea] font-semibold text-[#20302e]" : "text-[#65726f] hover:bg-white"}`} href={href}>{children}</Link>;
}

export function StudioPageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div>{eyebrow && <p className="label text-[10px] text-muted">{eyebrow}</p>}<h1 className={`${eyebrow ? "mt-1.5" : ""} font-title text-3xl font-normal tracking-tight sm:text-4xl`}>{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>}</div>{action}</header>;
}

export function StudioCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[24px] border border-[#20302e]/10 bg-white p-5 shadow-[0_16px_50px_rgba(32,48,46,.05)] sm:p-7 ${className}`}>{children}</section>;
}

