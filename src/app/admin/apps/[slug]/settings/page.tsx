import { notFound } from "next/navigation";
import AppsStudioShell, { StudioPageHeader } from "@/components/apps-studio/AppsStudioShell";
import AppSettingsForm from "@/components/apps-studio/AppSettingsForm";
import { getCatalogAppBySlug } from "@/lib/apps/catalog";

export const dynamic = "force-dynamic";

export default async function CatalogAppSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const app = await getCatalogAppBySlug(slug);
  if (!app || app.archivedAt) notFound();
  const isProfilMapp = app.slug === "profil-mapp";
  return <AppsStudioShell active="applications" appTab="settings" appSlug={app.slug} appName={app.name} appIconUrl={app.iconUrl} hasResults={false} hasEditor={isProfilMapp}>
    <StudioPageHeader eyebrow={app.name.toUpperCase()} title="Paramètres" description="Identité, accès, publication et affichage." />
    {isProfilMapp && <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
      <strong className="block">Validation avant publication</strong>
      <p className="mt-1 leading-6">Le parcours de prévisualisation utilise votre identité Ministry. Il ne publie pas l'outil aux étudiants.</p>
      <a className="mt-4 inline-flex rounded-lg bg-[#27302f] px-4 py-2 font-semibold text-[#fbeeda]" href="/apps/profil-mapp">Réaliser Profil MAPP</a>
    </div>}
    <AppSettingsForm app={app} returnTo={`/admin/apps/${app.slug}/settings`} cancelHref="/admin/apps" />
  </AppsStudioShell>;
}
