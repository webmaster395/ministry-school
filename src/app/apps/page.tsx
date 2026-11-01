import type { Metadata } from "next";
import AppsPortal from "./AppsPortal";
import { getCatalogApps } from "@/lib/apps/catalog";

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
  const apps = await getCatalogApps();
  return <AppsPortal applications={apps} />;
}
