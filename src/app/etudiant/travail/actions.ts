"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Coche ou décoche un travail pour l'étudiant connecté. */
export async function toggleAssignment(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const assignmentId = formData.get("assignment_id") as string;
  const isDone = formData.get("done") === "1";

  if (isDone) {
    await supabase
      .from("assignment_completions")
      .delete()
      .eq("assignment_id", assignmentId)
      .eq("user_id", user.id);
  } else {
    await supabase
      .from("assignment_completions")
      .upsert({ assignment_id: assignmentId, user_id: user.id });
  }

  revalidatePath("/etudiant/travail");
  revalidatePath("/etudiant");
  revalidatePath("/etudiant/seances", "layout");
}

/** Valide une étape d'un travail structuré et synchronise l'état global du devoir. */
export async function toggleAssignmentStep(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const assignmentId = String(formData.get("assignment_id") ?? "");
  const stepId = String(formData.get("step_id") ?? "");
  const totalSteps = Math.max(1, Number(formData.get("total_steps") ?? 1));
  const isDone = formData.get("done") === "1";
  if (!assignmentId || !stepId) return;

  if (isDone) {
    await supabase
      .from("assignment_step_completions")
      .delete()
      .eq("assignment_id", assignmentId)
      .eq("user_id", user.id)
      .eq("step_id", stepId);
  } else {
    await supabase.from("assignment_step_completions").upsert({
      assignment_id: assignmentId,
      user_id: user.id,
      step_id: stepId,
    });
  }

  const { count } = await supabase
    .from("assignment_step_completions")
    .select("step_id", { count: "exact", head: true })
    .eq("assignment_id", assignmentId)
    .eq("user_id", user.id);
  if ((count ?? 0) >= totalSteps)
    await supabase
      .from("assignment_completions")
      .upsert({ assignment_id: assignmentId, user_id: user.id });
  else
    await supabase
      .from("assignment_completions")
      .delete()
      .eq("assignment_id", assignmentId)
      .eq("user_id", user.id);

  revalidatePath("/etudiant/travail");
  revalidatePath("/etudiant", "layout");
  revalidatePath("/etudiant/seances", "layout");
}
