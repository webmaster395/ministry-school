"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function sendAnnouncement(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const title = formData.get("title") as string;
  const body = formData.get("body") as string;
  const ministryId = formData.get("ministry_id") as string;
  const day = formData.get("day") as string;

  const { error } = await supabase.from("announcements").insert({
    author_id: user.id,
    title,
    body,
    ministry_id: ministryId || null,
    day: day || null,
  });

  if (error) {
    throw new Error("L'envoi du message a échoué : " + error.message);
  }

  revalidatePath("/gestion/enseignement/messages");
  revalidatePath("/etudiant");
  revalidatePath("/etudiant/messages");
}

export async function deleteAnnouncement(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("announcement_id") as string;

  await supabase.from("announcements").delete().eq("id", id);

  revalidatePath("/gestion/enseignement/messages");
  revalidatePath("/etudiant/messages");
}
