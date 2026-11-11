import { redirect } from "next/navigation";
import { getViewer } from "@/lib/data/viewer";
import { getMappResultBundle, openMappQuestionnaire } from "@/lib/mapp/server";

export const dynamic = "force-dynamic";

export default async function ProfilMappPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/apps/profil-mapp");
  if (viewer.deactivated) redirect("/auth/desactive");

  let destination: string;
  try {
    const questionnaire = await openMappQuestionnaire();
    if (questionnaire.engine !== "hybrid-44") throw new Error("MAPP_OFFICIAL_SESSION_REQUIRED");

    if (questionnaire.status === "completed") {
      const result = await getMappResultBundle(questionnaire.attemptId);
      const unresolved = result.rankings.some((ranking) => ranking.tie_break_required && !ranking.resolved_order);
      destination = unresolved
        ? `/apps/profil-mapp/test/${questionnaire.attemptId}/departage?revision=${result.resultRevisionId}`
        : `/apps/profil-mapp/test/${questionnaire.attemptId}/resultat?revision=${result.resultRevisionId}`;
    } else {
      destination = `/apps/profil-mapp/test/${questionnaire.attemptId}`;
    }
  } catch (cause) {
    const technicalMessage = cause instanceof Error ? cause.message : "Accès impossible";
    const denied = technicalMessage.includes("MAPP_ACCESS_DENIED");
    return (
      <main className="min-h-dvh bg-[#f7f1e8] px-5 py-16 text-[#27302f]">
        <section className="mx-auto max-w-xl rounded-2xl border border-[#ded6c9] bg-white p-8 text-center shadow-sm">
          <p className="label mb-3 text-xs text-[#95617d]">Profil MAPP</p>
          <h1 className="font-title text-3xl">{denied ? "Accès Ministry non autorisé" : "Questionnaire indisponible"}</h1>
          <p className="mt-4 text-sm leading-6 text-[#6b7270]">
            {denied
              ? "Votre session Ministry est bien connectée, mais ce compte n’est pas encore autorisé à ouvrir le questionnaire officiel."
              : "Le questionnaire n’est pas encore ouvert ou sa configuration doit être vérifiée par l’équipe."}
          </p>
          <a className="mt-7 inline-flex rounded-lg bg-[#27302f] px-5 py-3 text-sm font-semibold text-[#fbeeda]" href="/etudiant/identite">
            Retour à Mon identité
          </a>
        </section>
      </main>
    );
  }

  redirect(destination);
}
