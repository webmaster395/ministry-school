import Link from "next/link";
import { ExternalLink, ShieldCheck } from "lucide-react";
import AppsStudioShell, { StudioCard, StudioPageHeader } from "@/components/apps-studio/AppsStudioShell";
import { getCatalogApps } from "@/lib/apps/catalog";

export const dynamic = "force-dynamic";

export default async function GeneropolySettingsPage() {
  const app = (await getCatalogApps({ includeUnpublished: true })).find((item) => item.slug === "generopoly");
  return <AppsStudioShell active="applications" appTab="settings"><StudioPageHeader eyebrow="GÉNÉROPOLY" title="Paramètres" description="Identité publique et état de l’intégration." /><div className="grid gap-5 lg:grid-cols-2"><StudioCard><p className="label text-[10px] text-[#50726c]">CATALOGUE</p><h2 className="mt-3 font-title text-2xl">{app?.name ?? "Généropoly"}</h2><dl className="mt-6 space-y-4 text-sm"><Row label="Statut" value={app?.status === "published" ? "Publiée" : app?.status === "scheduled" ? "Programmée" : app?.status === "disabled" ? "Désactivée" : "Brouillon"} /><Row label="Catégorie" value={app?.category ?? "Finance"} /><Row label="URL publique" value={app?.url ?? "—"} /></dl><Link href="/admin/apps" className="mt-6 inline-flex items-center gap-2 font-semibold text-[#2c6d65]">Modifier dans le catalogue <ExternalLink size={14} /></Link></StudioCard><StudioCard><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e8eeea] text-[#2c6d65]"><ShieldCheck size={20} /></span><h2 className="mt-5 font-title text-2xl">Connexion sécurisée</h2><p className="mt-2 leading-7 text-[#697572]">Les résultats sont lus côté serveur. La clé d’administration n’est jamais transmise au navigateur et les bases de données restent indépendantes.</p></StudioCard></div></AppsStudioShell>;
}
function Row({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-5 border-b border-[#20302e]/8 pb-3"><dt className="text-[#75807d]">{label}</dt><dd className="max-w-[60%] truncate font-semibold">{value}</dd></div>; }

