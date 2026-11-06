import { redirect } from "next/navigation";
import { getViewer } from "@/lib/data/viewer";
import { getMappResultBundle, openMappQuestionnaire } from "@/lib/mapp/server";
import { getGuestCredential, isMappGuestOpen, openGuestQuestionnaire } from "@/lib/mapp/guest";
import { GuestMappEntry } from "./GuestMappEntry";

export const dynamic = "force-dynamic";

export default async function ProfilMappPage() {
  const viewer = await getViewer();
  const guest = await getGuestCredential();
  if (guest) {
    const questionnaire = await openGuestQuestionnaire(guest.attemptId);
    if (questionnaire?.status === "completed") redirect(`/apps/profil-mapp/test/${guest.attemptId}/resultat`);
    if (questionnaire) redirect(`/apps/profil-mapp/test/${guest.attemptId}`);
  }
  if (!viewer?.roles.superAdmin) {
    if (!isMappGuestOpen()) return <main className="center-shell"><h1>Profil MAPP ouvre bientôt</h1><p>Le questionnaire sera accessible le 7 novembre 2026 à 07h00, heure de Paris.</p></main>;
    return <GuestMappEntry />;
  }
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
          <h1 className="font-title text-3xl">{denied ? "Accès réservé aux étudiants Ministry" : "Questionnaire indisponible"}</h1>
          <p className="mt-4 text-sm leading-6 text-[#6b7270]">
            {denied
              ? "Votre compte Ministry doit être un compte étudiant actif avec une adresse e-mail confirmée. Aucun second compte MAPP n’est demandé."
              : "Le questionnaire n’est pas encore ouvert ou sa configuration doit être vérifiée par l’équipe."}
          </p>
          <a className="mt-7 inline-flex rounded-lg bg-[#27302f] px-5 py-3 text-sm font-semibold text-[#fbeeda]" href="/apps">
            Retour à Mes outils
          </a>
        </section>
      </main>
    );
  }
  redirect(destination);
}
