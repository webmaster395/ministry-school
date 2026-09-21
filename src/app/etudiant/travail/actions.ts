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
}
