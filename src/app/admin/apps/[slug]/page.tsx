import { notFound, redirect } from "next/navigation";
import { getCatalogAppBySlug } from "@/lib/apps/catalog";

export const dynamic = "force-dynamic";

export default async function CatalogAppPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const app = await getCatalogAppBySlug(slug);
  if (!app || app.archivedAt) notFound();
  redirect(`/admin/apps/${app.slug}/settings`);
}
