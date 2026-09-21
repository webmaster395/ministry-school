"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QUESTION_CATEGORIES, type QuestionCategory } from "@/lib/questions";

/** Enregistre la question de la personne connectée. Elle est ensuite traitée depuis l'administration. */
export async function askQuestion(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const text = (key: string) => ((formData.get(key) as string) ?? "").trim();
  const category = text("category") as QuestionCategory;
  if (!(category in QUESTION_CATEGORIES)) throw new Error("Type de question inconnu");

  const { error } = await supabase.from("questions").insert({
    user_id: user.id,
    category,
    subject: text("subject").slice(0, 160),
    body: text("body").slice(0, 4000),
  });
  if (error) throw new Error("L'envoi de la question a échoué : " + error.message);

  revalidatePath("/etudiant/aide");
  revalidatePath("/admin");
  redirect("/etudiant/aide?envoye=1");
}
