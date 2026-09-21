"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Change la sensibilité (ministère) de l'étudiant connecté. */
export async function changeMinistry(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const ministryId = formData.get("ministry_id") as string;
  if (!ministryId) return;

  const { error } = await supabase
    .from("profiles")
    .update({ ministry_id: ministryId })
    .eq("id", user.id);

  if (error) throw new Error("Le changement de sensibilité a échoué : " + error.message);

  revalidatePath("/etudiant", "layout");
}
