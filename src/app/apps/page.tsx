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
  // Le catalogue public ne révèle pas MAPP. Une personne connectée retrouve
  // l'outil publié ; la RPC d'ouverture décide ensuite si son profil Ministry
  // actif et confirmé est autorisé à commencer le questionnaire.
  const apps = viewer?.roles.superAdmin
    ? await getCatalogApps({ includeUnpublished: true, channel: "admin" })
    : viewer
      ? await getStudentTools()
      : (await getCatalogApps()).filter((app) => app.slug !== "profil-mapp");
  return <AppsPortal applications={apps} />;
}
