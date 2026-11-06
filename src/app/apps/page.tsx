import type { Metadata } from "next";
import AppsPortal from "./AppsPortal";
import { getCatalogApps, getPublicToolsPortal } from "@/lib/apps/catalog";
import { getViewer } from "@/lib/data/viewer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Applications | Ministry School",
  description: "Des outils Ministry School conçus pour aller plus loin.",
  openGraph: {
    title: "Applications | Ministry School",
    description: "Des outils conçus pour vous.",
    url: "/apps",
  },
};

export default async function AppsPage() {
  const viewer = await getViewer();
  // URL publique unique de « Mes outils ». La page de chaque outil conserve
  // ses propres règles d'ouverture et de sécurité.
  const apps = viewer?.roles.superAdmin
    ? await getCatalogApps({ includeUnpublished: true, channel: "admin" })
    : await getPublicToolsPortal();
  return <AppsPortal applications={apps} />;
}
