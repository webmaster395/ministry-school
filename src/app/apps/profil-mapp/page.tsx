import { redirect } from "next/navigation";
import { getViewer } from "@/lib/data/viewer";
import { getIdentityDashboard } from "@/lib/identity/dashboard";
import { getOfficialMappIdentityResults } from "@/lib/mapp/official-results";
import { MappLanding } from "./MappLanding";

export const dynamic = "force-dynamic";

export default async function ProfilMappPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/apps/profil-mapp");
  if (viewer.deactivated) redirect("/auth/desactive");

  const dashboard = await getIdentityDashboard();
  const nativeResult = dashboard.identityResults.find((result) => result.kind === "mapp");
  const [archivedResult] = nativeResult ? [] : await getOfficialMappIdentityResults();
  const existingResult = nativeResult ?? archivedResult;
  if (existingResult?.attemptId) {
    const query = new URLSearchParams();
    if (existingResult.resultRevisionId) query.set("revision", existingResult.resultRevisionId);
    if (nativeResult) query.set("native", "1");
    else query.set("legacy", "1");
    const suffix = query.size ? `?${query.toString()}` : "";
    redirect(`/apps/profil-mapp/test/${existingResult.attemptId}/resultat${suffix}`);
  }

  return <MappLanding />;
}
