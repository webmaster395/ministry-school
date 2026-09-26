"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createCourse(formData: FormData) {
  const supabase = await createClient();

  const title = formData.get("title") as string;
  const ministryId = formData.get("ministry_id") as string;
  const description = formData.get("description") as string;
  const objectives = formData.get("objectives") as string;

  const { error } = await supabase.from("courses").insert({
    title,
    ministry_id: ministryId || null,
    description: description || null,
    objectives: objectives || null,
  });

  if (error) {
    throw new Error("La création du cours a échoué : " + error.message);
  }

  revalidatePath("/gestion/admin/cours");
  revalidatePath("/gestion/admin/seances");
}

export async function deleteCourse(formData: FormData) {
  const supabase = await createClient();
  const courseId = formData.get("course_id") as string;

  await supabase.from("courses").delete().eq("id", courseId);

  revalidatePath("/gestion/admin/cours");
  revalidatePath("/gestion/admin/seances");
}

export async function renameCourse(formData: FormData) {
  const supabase = await createClient();
  const courseId = formData.get("course_id") as string;
  const title = ((formData.get("title") as string) ?? "").trim();
  if (!title) throw new Error("L'intitulé ne peut pas être vide.");
  const description = ((formData.get("description") as string) ?? "").trim();

  const { data, error } = await supabase
    .from("courses")
    .update({ title, description: description || null })
    .eq("id", courseId)
    .select("id");
  if (error) throw new Error("La modification du cours a échoué : " + error.message);
  if (!data?.length) throw new Error("Vous n'avez pas le droit de modifier ce cours.");

  revalidatePath("/gestion/admin/cours");
  revalidatePath("/gestion/admin/seances");
  revalidatePath("/etudiant", "layout");
}
