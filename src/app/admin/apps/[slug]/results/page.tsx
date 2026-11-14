import { notFound } from "next/navigation";
import AppsStudioShell, { StudioPageHeader } from "@/components/apps-studio/AppsStudioShell";
import GraceIdentityResults from "@/components/apps-studio/GraceIdentityResults";
import { getCatalogAppBySlug } from "@/lib/apps/catalog";
import { getGraceIdentitySummary } from "@/lib/apps/grace-identity-results";
import { graceTestKeyFromSlug } from "@/lib/apps/grace-identity";

export const dynamic = "force-dynamic";

export default async function CatalogToolResultsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [app, summary] = await Promise.all([getCatalogAppBySlug(slug), getGraceIdentitySummary()]);
  const focus = graceTestKeyFromSlug(slug);
  if (!app || app.archivedAt || !focus) notFound();

  return <AppsStudioShell active="results" appTab="results" appSlug={app.slug} appName={app.name} appIconUrl={app.iconUrl} hasResults hasEditor={false}>
    <StudioPageHeader eyebrow={app.name.toUpperCase()} title="Résultats" description="Données agrégées de ce test, sans afficher les réponses personnelles des étudiants." />
    <GraceIdentityResults summary={summary} focus={focus} />
  </AppsStudioShell>;
}
