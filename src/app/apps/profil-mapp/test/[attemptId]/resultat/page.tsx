import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/data/viewer";
import { getMappResultBundle } from "@/lib/mapp/server";
import { OfficialResultClient } from "./OfficialResultClient";
import { getGuestCredential, getGuestResult } from "@/lib/mapp/guest";

export const dynamic = "force-dynamic";

export default async function OfficialMappResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const guest = await getGuestCredential(attemptId);
  const viewer = guest ? null : await getViewer();
  if (!guest && (!viewer || viewer.deactivated || !viewer.roles.superAdmin)) notFound();
  const bundle = guest ? await getGuestResult(attemptId) : await getMappResultBundle(attemptId).catch(() => null);
  if (!bundle) notFound();
  if (bundle.rankings.some((ranking) => ranking.tie_break_required && !ranking.resolved_order)) {
    redirect(`/apps/profil-mapp/test/${attemptId}/departage?revision=${bundle.resultRevisionId}`);
  }
  return <><OfficialResultClient bundle={bundle} />{guest && <aside className="recovery-code" aria-label="Code de récupération"><strong>Code de récupération personnel</strong><code>{guest.recoveryCode}</code><p>Conserve ce code. Il sera exigé, avec ta connexion Ministry confirmée, pour rattacher ce résultat à ton compte.</p></aside>}</>;
}
