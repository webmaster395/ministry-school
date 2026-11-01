import Link from "next/link";
import { ArrowLeft, Grid2X2, Presentation, Settings2 } from "lucide-react";

type StudioTab = "applications" | "results";
type AppTab = "overview" | "results" | "editor" | "settings";

export default function AppsStudioShell({
  children,
  active,
  appTab,
  appSlug = "generopoly",
  appName = "Généropoly",
  hasResults = true,
  hasEditor = true,
}: {
  children: React.ReactNode;
  active: StudioTab;
  appTab?: AppTab;
  appSlug?: string;
  appName?: string;
  hasResults?: boolean;
  hasEditor?: boolean;
}) {
  return (
    <div className="min-h-screen bg-[#f5f7f4] text-[#20302e]">
      <header className="border-b border-[#20302e]/10 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div className="flex items-center gap-4">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#20302e] text-[#fbeeda]"><Grid2X2 size={21} /></span>
            <div><p className="label text-[10px] text-[#6b7270]">MINISTRY SCHOOL</p><strong className="font-title text-xl">Gestion des outils</strong></div>
          </div>
          <Link className="inline-flex items-center gap-2 text-sm text-[#5d6b68] transition hover:text-[#20302e]" href="/gestion/admin"><ArrowLeft size={15} /> Retour à Ministry School</Link>
        </div>
        <nav className="mx-auto flex max-w-[1440px] gap-7 overflow-x-auto px-5 sm:px-8" aria-label="Navigation du studio">
          <StudioLink href="/admin/apps" active={active === "applications"}>Applications</StudioLink>
          <StudioLink href="/admin/apps/generopoly/results" active={active === "results"}>Résultats</StudioLink>
        </nav>
      </header>

      {appTab && (
        <nav className="border-b border-[#20302e]/8 bg-[#fbfcfa]" aria-label="Navigation Généropoly">
          <div className="mx-auto flex max-w-[1440px] gap-2 overflow-x-auto px-5 py-3 sm:px-8">
            <AppLink href={`/admin/apps/${appSlug}`} active={appTab === "overview"}>Vue d’ensemble</AppLink>
            {hasResults && <AppLink href={`/admin/apps/${appSlug}/results`} active={appTab === "results"}>Résultats</AppLink>}
            {hasEditor && <AppLink href={`/admin/apps/${appSlug}/editor`} active={appTab === "editor"}>Contenus</AppLink>}
            <AppLink href={`/admin/apps/${appSlug}/settings`} active={appTab === "settings"}>Paramètres</AppLink>
            {appSlug === "generopoly" && <Link aria-label={`Projeter les résultats de ${appName}`} className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-full bg-[#20302e] px-4 py-2 text-sm font-semibold text-[#fbeeda]" href="/admin/apps/generopoly/projection" target="_blank"><Presentation size={15} /> Projeter</Link>}
          </div>
        </nav>
      )}

      <main className="mx-auto w-full max-w-[1440px] px-5 py-8 sm:px-8 sm:py-11">{children}</main>
    </div>
  );
}

function StudioLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return <Link className={`border-b-2 py-4 text-sm font-semibold transition ${active ? "border-[#20302e] text-[#20302e]" : "border-transparent text-[#74807d] hover:text-[#20302e]"}`} href={href}>{children}</Link>;
}

function AppLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return <Link className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${active ? "bg-[#e8eeea] font-semibold text-[#20302e]" : "text-[#65726f] hover:bg-white"}`} href={href}>{children}</Link>;
}

export function StudioPageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return <header className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="label text-[11px] text-[#50726c]">{eyebrow}</p><h1 className="mt-2 font-title text-4xl tracking-tight sm:text-5xl">{title}</h1>{description && <p className="mt-3 max-w-2xl text-base leading-7 text-[#697572]">{description}</p>}</div>{action}</header>;
}

export function StudioCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[24px] border border-[#20302e]/10 bg-white p-5 shadow-[0_16px_50px_rgba(32,48,46,.05)] sm:p-7 ${className}`}>{children}</section>;
}

export function ComingSoonEditor() {
  return <StudioCard><div className="flex items-start gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e8eeea]"><Settings2 size={20} /></span><div><h2 className="font-title text-2xl">Éditeur de contenu</h2><p className="mt-2 max-w-2xl leading-7 text-[#697572]">L’architecture isole déjà les contenus publiés, les brouillons et la version utilisée par chaque partie. L’édition visuelle et l’historique des versions constituent la deuxième livraison.</p></div></div></StudioCard>;
}

