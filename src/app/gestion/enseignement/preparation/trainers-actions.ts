"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";

export async function updateSessionTrainers(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer) throw new Error("Connexion requise.");
  const sessionId = String(formData.get("session_id") ?? "");
  const trainerIds = formData.getAll("trainer_ids").map(String);
  const supabase = await createClient();
  const { data: session } = await supabase.from("sessions").select("teacher_id, ministry_id").eq("id", sessionId).single();
  const canEdit = viewer.roles.admin || session?.teacher_id === viewer.id || (!!session?.ministry_id && viewer.roles.steeringMinistryIds.includes(session.ministry_id));
  if (!canEdit) throw new Error("Tu ne peux pas modifier les formateurs de cette séance.");

  const { error: removeError } = await supabase.from("session_trainers").delete().eq("session_id", sessionId);
  if (removeError) throw new Error(removeError.message);
  if (trainerIds.length) {
    const { error } = await supabase.from("session_trainers").insert(trainerIds.map((trainerId, position) => ({ session_id: sessionId, trainer_id: trainerId, position })));
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/gestion/enseignement/preparation/${sessionId}`);
  revalidatePath(`/etudiant/seances/${sessionId}`);
}
