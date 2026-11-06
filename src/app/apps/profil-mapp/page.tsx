import { redirect } from "next/navigation";
import { getGuestCredential, openGuestQuestionnaire } from "@/lib/mapp/guest";
import { GuestMappEntry } from "./GuestMappEntry";

export const dynamic = "force-dynamic";

export default async function ProfilMappPage() {
  const guest = await getGuestCredential();
  if (guest) {
    const questionnaire = await openGuestQuestionnaire(guest.attemptId);
    if (questionnaire?.status === "completed") redirect(`/apps/profil-mapp/test/${guest.attemptId}/resultat`);
    if (questionnaire) redirect(`/apps/profil-mapp/test/${guest.attemptId}`);
  }
  return <GuestMappEntry />;
}
