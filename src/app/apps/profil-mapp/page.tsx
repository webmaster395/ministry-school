import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/data/viewer";
import { getMappResultBundle, openMappQuestionnaire } from "@/lib/mapp/server";

export const dynamic = "force-dynamic";

export default async function ProfilMappPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/apps/profil-mapp");
  if (viewer.deactivated) redirect("/auth/desactive");

  if (!viewer.roles.superAdmin) notFound();

  try {
    const questionnaire = await openMappQuestionnaire();
    if (questionnaire.engine !== "hybrid-44") throw new Error("MAPP_OFFICIAL_SESSION_REQUIRED");
    if (questionnaire.status === "completed") {
      const result = await getMappResultBundle(questionnaire.attemptId);
      const unresolved = result.rankings.some((ranking) => ranking.tie_break_required && !ranking.resolved_order);
      redirect(unresolved
        ? `/apps/profil-mapp/test/${questionnaire.attemptId}/departage?revision=${result.resultRevisionId}`
        : `/apps/profil-mapp/test/${questionnaire.attemptId}/resultat?revision=${result.resultRevisionId}`);
    }
    redirect(`/apps/profil-mapp/test/${questionnaire.attemptId}`);
  } catch (cause) {
    const technicalMessage = cause instanceof Error ? cause.message : "Accès impossible";
    const denied = technicalMessage.includes("MAPP_ACCESS_DENIED");
    return (
      <main className="min-h-dvh bg-[#f7f1e8] px-5 py-16 text-[#27302f]">
        <section className="mx-auto max-w-xl rounded-2xl border border-[#ded6c9] bg-white p-8 text-center shadow-sm">
          <p className="label mb-3 text-xs text-[#95617d]">Profil MAPP</p>
          <h1 className="font-title text-3xl">{denied ? "Accès réservé aux étudiants Ministry" : "Questionnaire indisponible"}</h1>
          <p className="mt-4 text-sm leading-6 text-[#6b7270]">
            {denied
              ? "Votre compte Ministry doit être un compte étudiant actif avec une adresse e-mail confirmée. Aucun second compte MAPP n’est demandé."
              : "Le questionnaire n’est pas encore ouvert ou sa configuration doit être vérifiée par l’équipe."}
          </p>
          <a className="mt-7 inline-flex rounded-lg bg-[#27302f] px-5 py-3 text-sm font-semibold text-[#fbeeda]" href="/etudiant/outils">
            Retour à Mes outils
          </a>
        </section>
      </main>
    );
  }
}
