import Link from "next/link";
import { ArrowLeft, Grid2X2, Presentation, Settings2 } from "lucide-react";
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
  showGeneralSettings = false,
}: {
  children: React.ReactNode;
  active: StudioTab;
  appTab?: AppTab;
  appSlug?: string;
  appName?: string;
  appIconUrl?: string | null;
  hasResults?: boolean;
  hasEditor?: boolean;
  showGeneralSettings?: boolean;
}) {
  return (
    <div data-studio-section={active} className="min-h-screen bg-[#f5f7f4] text-[#20302e]">
      <header className="border-b border-[#20302e]/10 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div className="flex items-center gap-4">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#20302e] text-[#fbeeda]"><Grid2X2 size={21} /></span>
            <div><p className="label text-[10px] text-[#6b7270]">MINISTRY SCHOOL</p><strong className="font-title text-xl font-normal">Studio</strong></div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-4">{showGeneralSettings && <Link className="text-sm text-[#5d6b68] transition hover:text-[#20302e]" href="#parametres-generaux">Paramètres généraux</Link>}<Link className="inline-flex items-center gap-2 text-sm text-[#5d6b68] transition hover:text-[#20302e]" href="/gestion/admin"><ArrowLeft size={15} /> Retour à Ministry School</Link></div>
        </div>
      </header>

      {appTab && (
        <section className="border-b border-[#20302e]/8 bg-[#fbfcfa]">
          <div className="mx-auto max-w-[1440px] px-5 pt-5 sm:px-8"><div className="flex flex-wrap items-center gap-2 text-sm text-[#74807d]"><Link href="/admin/apps" className="inline-flex items-center gap-1 hover:text-[#20302e]"><ArrowLeft size={14} /> Gestion des outils</Link><span aria-hidden="true">/</span><span>{appName}</span></div><div className="mt-4 flex items-center gap-3">{appIconUrl ? <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-[14px] bg-[#eef1ed]"><img src={appIconUrl} alt="" className="h-full w-full object-contain" /></span> : <span className="grid h-12 w-12 place-items-center rounded-[14px] bg-[#e8eeea] font-title text-xl">{appName.slice(0, 1)}</span>}<h1 className="font-title text-2xl font-normal sm:text-3xl">{appName}</h1></div></div>
          <nav className="mx-auto flex max-w-[1440px] gap-2 overflow-x-auto px-5 py-4 sm:px-8" aria-label={`Navigation ${appName}`}>
            {hasResults && <AppLink href={`/admin/apps/${appSlug}/results`} active={appTab === "results"}>Résultats</AppLink>}
            {hasEditor && <AppLink href={`/admin/apps/${appSlug}/editor`} active={appTab === "editor"}>Éditeur</AppLink>}
            <AppLink href={`/admin/apps/${appSlug}/settings`} active={appTab === "settings"}>Paramètres</AppLink>
            {appSlug === "generopoly" && <Link aria-label={`Projeter les résultats de ${appName}`} className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-full bg-[#20302e] px-4 py-2 text-sm font-semibold text-[#fbeeda]" href="/admin/apps/generopoly/projection" target="_blank"><Presentation size={15} /> Projeter</Link>}
          </nav>
        </section>
      )}

      <main className="mx-auto w-full max-w-[1440px] px-5 py-8 sm:px-8 sm:py-11">{children}</main>
    </div>
  );
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

