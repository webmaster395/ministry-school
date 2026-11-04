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
  // Depuis la navigation étudiante, /apps devient la liste personnelle : elle
  // n’expose que les outils effectivement publiés pour cet espace et cette date.
  // Sans session, le portail public conserve son comportement existant.
  const apps = viewer && !viewer.roles.superAdmin ? await getStudentTools() : await getCatalogApps();
  return <AppsPortal applications={apps} />;
}
