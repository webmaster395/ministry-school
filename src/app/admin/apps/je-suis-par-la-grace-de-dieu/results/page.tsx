import { notFound } from "next/navigation";
import AppsStudioShell, { StudioPageHeader } from "@/components/apps-studio/AppsStudioShell";
import GraceIdentityResults from "@/components/apps-studio/GraceIdentityResults";
import { getCatalogAppBySlug } from "@/lib/apps/catalog";
import { getGraceIdentitySummary } from "@/lib/apps/grace-identity-results";

export const dynamic = "force-dynamic";

export default async function GraceIdentityResultsPage() {
  const app = await getCatalogAppBySlug("je-suis-par-la-grace-de-dieu");
  if (!app || app.archivedAt) notFound();
  const summary = await getGraceIdentitySummary();
  return <AppsStudioShell active="results" appTab="results" appSlug={app.slug} appName={app.name} appIconUrl={app.iconUrl} hasResults hasEditor={false}><StudioPageHeader eyebrow="JE SUIS CE QUE JE SUIS PAR LA GRÂCE DE DIEU" title="Résultats" description="Suivez les autoévaluations enregistrées, avec des données agrégées et respectueuses de la confidentialité." /><GraceIdentityResults summary={summary} /></AppsStudioShell>;
}
