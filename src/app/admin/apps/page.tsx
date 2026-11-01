import Link from "next/link";
import { ArrowRight, Gamepad2 } from "lucide-react";
import { getCatalogApps } from "@/lib/apps/catalog";
import AppCatalogManager from "@/components/apps-studio/AppCatalogManager";
import AppsStudioShell, { StudioCard, StudioPageHeader } from "@/components/apps-studio/AppsStudioShell";

export const dynamic = "force-dynamic";

export default async function AppsStudioPage() {
  const apps = await getCatalogApps({ includeUnpublished: true });
  return <AppsStudioShell active="applications">
    <StudioPageHeader eyebrow="STUDIO D’ADMINISTRATION" title="Applications" description="Publiez, organisez et pilotez les outils pédagogiques visibles dans le Launchpad Ministry School." />
    <Link href="/admin/apps/generopoly" className="mb-8 block"><StudioCard className="group flex items-center gap-5 border-[#20302e]/15 bg-[#20302e] text-white"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10"><Gamepad2 size={26} /></span><span className="flex-1"><span className="label text-[10px] text-[#c8d5d1]">APPLICATION ADMINISTRÉE</span><strong className="mt-1 block font-title text-2xl">Généropoly</strong><span className="mt-1 block text-sm text-white/65">Résultats en direct, réponses collectives et mode projection.</span></span><ArrowRight className="transition group-hover:translate-x-1" /></StudioCard></Link>
    <AppCatalogManager apps={apps} />
  </AppsStudioShell>;
}

