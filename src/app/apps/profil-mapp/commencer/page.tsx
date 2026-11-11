import { redirect } from "next/navigation";
import { getViewer } from "@/lib/data/viewer";
import { getIdentityDashboard } from "@/lib/identity/dashboard";
import { getMappResultBundle, openMappQuestionnaire } from "@/lib/mapp/server";

export const dynamic = "force-dynamic";

export default async function StartProfilMappPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/apps/profil-mapp");
  if (viewer.deactivated) redirect("/auth/desactive");

  const dashboard = await getIdentityDashboard();
  const existingResult = dashboard.identityResults.find((result) => result.kind === "mapp");
  if (existingResult?.attemptId) {
    const query = new URLSearchParams({ native: "1" });
    if (existingResult.resultRevisionId) query.set("revision", existingResult.resultRevisionId);
    redirect(`/apps/profil-mapp/test/${existingResult.attemptId}/resultat?${query.toString()}`);
  }

  let destination: string;
  try {
    const questionnaire = await openMappQuestionnaire();
    if (questionnaire.engine !== "hybrid-44") throw new Error("MAPP_OFFICIAL_SESSION_REQUIRED");
    if (questionnaire.status === "completed") {
      const result = await getMappResultBundle(questionnaire.attemptId);
      destination = `/apps/profil-mapp/test/${questionnaire.attemptId}/resultat?revision=${result.resultRevisionId}&native=1`;
    } else {
      destination = `/apps/profil-mapp/test/${questionnaire.attemptId}?native=1`;
    }
  } catch (cause) {
    const technicalMessage = cause instanceof Error ? cause.message : "Accès impossible";
    const denied = technicalMessage.includes("MAPP_ACCESS_DENIED");
    return <main className="min-h-dvh bg-[#f7f1e8] px-5 py-16 text-[#27302f]">
      <section className="mx-auto max-w-xl rounded-2xl border border-[#ded6c9] bg-white p-8 text-center shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.16em] text-[#95617d]">Profil MAPP</p>
        <h1 className="text-3xl font-semibold">{denied ? "Accès Ministry non autorisé" : "Questionnaire indisponible"}</h1>
        <p className="mt-4 text-sm leading-6 text-[#6b7270]">{denied ? "Votre compte Ministry ne peut pas encore ouvrir ce questionnaire." : "Le questionnaire n’est pas encore ouvert ou sa configuration doit être vérifiée."}</p>
        <a className="mt-7 inline-flex rounded-lg bg-[#27302f] px-5 py-3 text-sm font-semibold text-[#fbeeda]" href="/apps/profil-mapp">Retour à l’accueil MAPP</a>
      </section>
    </main>;
  }
  redirect(destination);
}
