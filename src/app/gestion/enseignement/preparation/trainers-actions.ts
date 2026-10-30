"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";
import { invalidateStudentProgram } from "@/lib/cache/program";
import { assertPilotageRequestScope } from "@/lib/pilotage-scope";

export async function updateSessionTrainers(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer) throw new Error("Connexion requise.");
  const sessionId = String(formData.get("session_id") ?? "");
  const trainerIds = formData.getAll("trainer_ids").map(String);
  const supabase = await createClient();
  await assertPilotageRequestScope(supabase, sessionId);
  const { data: pilotCanEdit } = await supabase.rpc("can_edit_ministry_course", { p_session: sessionId });
  const canEdit = viewer.roles.superAdmin || !!pilotCanEdit;
  if (!canEdit) throw new Error("Tu ne peux pas modifier les intervenants de cette séance.");

  const { error: removeError } = await supabase.from("session_trainers").delete().eq("session_id", sessionId);
  if (removeError) throw new Error(removeError.message);
  if (trainerIds.length) {
    const { error } = await supabase.from("session_trainers").insert(trainerIds.map((trainerId, position) => ({ session_id: sessionId, trainer_id: trainerId, position })));
    if (error) throw new Error(error.message);
  }
  invalidateStudentProgram();

  revalidatePath(`/gestion/enseignement/preparation/${sessionId}`);
  revalidatePath("/gestion/projets-formations", "layout");
  revalidatePath(`/etudiant/seances/${sessionId}`);
  revalidatePath("/etudiant", "layout");
}
