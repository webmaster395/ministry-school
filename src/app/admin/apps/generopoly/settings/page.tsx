import { notFound } from "next/navigation";
import AppsStudioShell, { StudioPageHeader } from "@/components/apps-studio/AppsStudioShell";
import AppSettingsForm from "@/components/apps-studio/AppSettingsForm";
import { getCatalogAppBySlug } from "@/lib/apps/catalog";

export const dynamic = "force-dynamic";

export default async function GeneropolySettingsPage() {
  const app = await getCatalogAppBySlug("generopoly");
  if (!app || app.archivedAt) notFound();
  return <AppsStudioShell active="applications" appTab="settings"><StudioPageHeader eyebrow="GÉNÉROPOLY" title="Paramètres" description="Identité, accès, publication et visibilité." /><AppSettingsForm app={app} returnTo="/admin/apps/generopoly/settings" cancelHref="/admin/apps/generopoly" /></AppsStudioShell>;
}
