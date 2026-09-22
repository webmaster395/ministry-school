"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer, isPlainStudent } from "@/lib/data/viewer";
import { QUESTION_CATEGORIES, QUESTIONS_EMAIL, type QuestionCategory } from "@/lib/questions";
import { sendMail } from "@/lib/mail";

/** Enregistre la question de la personne connectée. Elle est ensuite traitée depuis l'administration. */
export async function askQuestion(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const viewer = await getViewer();
  if (!viewer || !isPlainStudent(viewer.roles)) {
    throw new Error("Les questions sont réservées aux étudiants.");
  }

  const text = (key: string) => ((formData.get(key) as string) ?? "").trim();
  const category = text("category") as QuestionCategory;
  if (!(category in QUESTION_CATEGORIES)) throw new Error("Type de question inconnu");

  const subject = text("subject").slice(0, 160);
  const body = text("body").slice(0, 4000);

  const { error } = await supabase.from("questions").insert({
    user_id: user.id,
    category,
    subject,
    body,
  });
  if (error) throw new Error("L'envoi de la question a échoué : " + error.message);

  // La question est déjà enregistrée (source fiable, visible dans l'Admin) : un souci d'e-mail
  // ne doit pas faire échouer l'envoi pour la personne qui pose la question.
  try {
    const label = QUESTION_CATEGORIES[category].label;
    await sendMail({
      to: QUESTIONS_EMAIL,
      subject: `Nouvelle question Ministry School — ${label}`,
      text: `${viewer.fullName} a posé une question (${label}) :\n\n${subject}\n\n${body}\n\nÀ traiter depuis l'espace Admin › Questions.`,
    });
  } catch (e) {
    console.error("Échec de l'e-mail de notification de question", e);
  }

  revalidatePath("/etudiant/aide");
  revalidatePath("/admin");
  redirect("/etudiant/aide?envoye=1");
}
