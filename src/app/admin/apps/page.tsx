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
  return <AppsStudioShell active="applications" showGeneralSettings>
    <StudioPageHeader eyebrow="STUDIO D’ADMINISTRATION" title="Gestion des outils" description="Gérez vos applications et leur publication." />
    <AppCatalogManager apps={apps} archivedApps={archivedApps} studentToolsEnabled={studentToolsEnabled} />
  </AppsStudioShell>;
}

