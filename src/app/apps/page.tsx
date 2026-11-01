import type { Metadata } from "next";
import AppsPortal from "./AppsPortal";

export const metadata: Metadata = {
  title: "Applications | Ministry School",
  description: "Des outils Ministry School conçus pour aller plus loin.",
  openGraph: {
    title: "Applications | Ministry School",
    description: "Des outils conçus pour vous.",
    url: "/apps",
  },
};

export default function AppsPage() {
  return <AppsPortal />;
}
