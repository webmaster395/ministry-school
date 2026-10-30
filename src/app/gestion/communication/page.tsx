import { redirect } from "next/navigation";
import { getViewer } from "@/lib/data/viewer";

export default async function RemovedCommunicationPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  redirect(viewer.roles.steeringMinistryIds.length ? "/gestion/pilotage" : "/gestion/admin");
}
