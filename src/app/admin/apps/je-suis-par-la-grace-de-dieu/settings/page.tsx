import { notFound } from "next/navigation";
import AppsStudioShell, { StudioPageHeader } from "@/components/apps-studio/AppsStudioShell";
import AppSettingsForm from "@/components/apps-studio/AppSettingsForm";
import { getCatalogAppBySlug } from "@/lib/apps/catalog";

export const dynamic = "force-dynamic";

export default async function GraceIdentitySettingsPage() {
  const app = await getCatalogAppBySlug("je-suis-par-la-grace-de-dieu");
  if (!app || app.archivedAt) notFound();
  return <AppsStudioShell active="applications" appTab="settings" appSlug={app.slug} appName={app.name} appIconUrl={app.iconUrl} hasResults hasEditor={false}><StudioPageHeader eyebrow="JE SUIS CE QUE JE SUIS PAR LA GRÂCE DE DIEU" title="Paramètres" description="Identité, accès, programmation de publication et visibilité." /><AppSettingsForm app={app} returnTo={`/admin/apps/${app.slug}/settings`} cancelHref="/admin/apps" /></AppsStudioShell>;
}
