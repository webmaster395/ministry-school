import Link from "next/link";
import { Plus } from "lucide-react";
import { getCatalogApps, getStudentToolsEnabled } from "@/lib/apps/catalog";
import AppCatalogManager from "@/components/apps-studio/AppCatalogManager";
import AppsStudioShell, { StudioPageHeader } from "@/components/apps-studio/AppsStudioShell";

export const dynamic = "force-dynamic";

export default async function AppsStudioPage() {
  const [catalog, studentToolsEnabled] = await Promise.all([
    getCatalogApps({ includeUnpublished: true, includeArchived: true, channel: "admin" }),
    getStudentToolsEnabled(),
  ]);
  const apps = catalog.filter((app) => !app.archivedAt);
  const archivedApps = catalog.filter((app) => !!app.archivedAt);
  return <AppsStudioShell active="applications">
    <StudioPageHeader eyebrow="STUDIO D’ADMINISTRATION" title="Gestion des outils" description="Gérez vos applications et leur publication." action={<Link href="/admin/apps/nouveau" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#20302e] px-5 py-3 text-sm font-semibold text-[#fbeeda]"><Plus size={16} /> Ajouter une application</Link>} />
    <AppCatalogManager apps={apps} archivedApps={archivedApps} studentToolsEnabled={studentToolsEnabled} />
  </AppsStudioShell>;
}

