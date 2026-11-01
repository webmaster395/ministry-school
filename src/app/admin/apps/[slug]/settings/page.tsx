import { notFound } from "next/navigation";
import AppsStudioShell, { StudioPageHeader } from "@/components/apps-studio/AppsStudioShell";
import AppSettingsForm from "@/components/apps-studio/AppSettingsForm";
import { getCatalogAppBySlug } from "@/lib/apps/catalog";

export const dynamic = "force-dynamic";

export default async function CatalogAppSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const app = await getCatalogAppBySlug(slug);
  if (!app || app.archivedAt) notFound();
  return <AppsStudioShell active="applications" appTab="settings" appSlug={app.slug} appName={app.name} hasResults={false} hasEditor={false}><StudioPageHeader eyebrow={app.name.toUpperCase()} title="Paramètres" description="Identité, accès, publication et affichage." /><AppSettingsForm app={app} returnTo={`/admin/apps/${app.slug}/settings`} cancelHref={`/admin/apps/${app.slug}`} /></AppsStudioShell>;
}
