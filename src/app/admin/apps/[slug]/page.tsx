import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Settings2 } from "lucide-react";
import AppsStudioShell, { StudioCard, StudioPageHeader } from "@/components/apps-studio/AppsStudioShell";
import { getCatalogAppBySlug } from "@/lib/apps/catalog";
import { formatParisSchedule } from "@/lib/apps/publication";

export const dynamic = "force-dynamic";

export default async function CatalogAppOverviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const app = await getCatalogAppBySlug(slug);
  if (!app || app.archivedAt) notFound();
  return <AppsStudioShell active="applications" appTab="overview" appSlug={app.slug} appName={app.name} hasResults={false} hasEditor={false}>
    <StudioPageHeader eyebrow={app.category.toUpperCase()} title={app.name} description={app.description || "Application du catalogue Ministry School."} action={<a href={app.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[#20302e]/15 bg-white px-5 py-3 text-sm font-semibold">Voir l’application <ExternalLink size={15} /></a>} />
    <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><StudioCard><h2 className="font-title text-2xl font-normal">Publication</h2><dl className="mt-6 space-y-4 text-sm"><Row label="Statut" value={statusLabel(app.status)} /><Row label="Portail public" value={app.publicEnabled ? formatParisSchedule(app.publicPublishAt) : "Masquée"} /><Row label="Espace étudiant" value={app.studentEnabled ? formatParisSchedule(app.studentPublishAt) : "Masquée"} /><Row label="Ordre" value={String(app.order)} /></dl></StudioCard><Link href={`/admin/apps/${app.slug}/settings`}><StudioCard className="group h-full"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e8eeea]"><Settings2 size={20} /></span><h2 className="mt-6 font-title text-2xl font-normal">Paramètres</h2><p className="mt-2 leading-7 text-[#697572]">Modifier l’identité, l’URL, les canaux de visibilité et la programmation.</p><span className="mt-6 block text-sm font-semibold text-[#2c6d65]">Ouvrir les paramètres →</span></StudioCard></Link></div>
  </AppsStudioShell>;
}

function Row({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-5 border-b border-[#20302e]/8 pb-3"><dt className="text-[#75807d]">{label}</dt><dd className="text-right font-medium">{value}</dd></div>; }
function statusLabel(status: string) { return status === "published" ? "Publiée" : status === "scheduled" ? "Programmée" : status === "disabled" ? "Désactivée" : "Brouillon"; }
