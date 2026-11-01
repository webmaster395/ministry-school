import Link from "next/link";
import { Plus, Settings } from "lucide-react";
import { getCatalogApps, getStudentToolsEnabled } from "@/lib/apps/catalog";
import AppCatalogManager, { StudentToolsSetting } from "@/components/apps-studio/AppCatalogManager";
import AppsStudioShell, { StudioPageHeader } from "@/components/apps-studio/AppsStudioShell";

export const dynamic = "force-dynamic";

export default async function AppsStudioPage({ searchParams }: { searchParams: Promise<{ parametres?: string }> }) {
  const [catalog, studentToolsEnabled] = await Promise.all([
    getCatalogApps({ includeUnpublished: true, includeArchived: true, channel: "admin" }),
    getStudentToolsEnabled(),
  ]);
  const apps = catalog.filter((app) => !app.archivedAt);
  const archivedApps = catalog.filter((app) => !!app.archivedAt);
  const showSettings = (await searchParams).parametres === "1";
  return <AppsStudioShell active="applications">
    <StudioPageHeader title="Gestion des outils" action={<div className="flex flex-wrap gap-2"><Link href={showSettings ? "/admin/apps" : "/admin/apps?parametres=1"} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-background px-4 text-xs font-medium"><Settings size={14} /> Paramètres</Link><Link href="/admin/apps/nouveau" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-foreground px-4 text-xs font-semibold text-on-accent"><Plus size={15} /> Ajouter un outil</Link></div>} />
    {showSettings && <StudentToolsSetting enabled={studentToolsEnabled} />}
    <AppCatalogManager apps={apps} archivedApps={archivedApps} studentToolsEnabled={studentToolsEnabled} />
  </AppsStudioShell>;
}

