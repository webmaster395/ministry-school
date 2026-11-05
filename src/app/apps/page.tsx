import type { Metadata } from "next";
import AppsPortal from "./AppsPortal";
import { getCatalogApps, getStudentTools } from "@/lib/apps/catalog";
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
  // Profil MAPP reste en préouverture : seul un super administrateur peut le
  // voir dans le catalogue et l'ouvrir. Le filtrage ici complète le contrôle
  // serveur de /apps/profil-mapp effectué dans proxy.ts.
  const apps = viewer?.roles.superAdmin
    ? await getCatalogApps({ includeUnpublished: true, channel: "admin" })
    : (viewer ? await getStudentTools() : await getCatalogApps()).filter(
        (app) => app.slug !== "profil-mapp",
      );
  return <AppsPortal applications={apps} />;
}
