import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // On arrive d'abord sur la vue de son rôle (administration, enseignant, pilotage, propositions),
  // sinon sur la vue étudiant.
  const viewer = await getViewer();
  const r = viewer?.roles;
  redirect(
    r?.admin
      ? "/admin"
      : r?.teacher
        ? "/etudiant/enseignement"
        : r && r.steeringMinistryIds.length > 0
          ? "/etudiant/pilotage"
          : r?.serviceLead || r?.projectLead
            ? "/etudiant/services"
            : "/etudiant"
  );
}
