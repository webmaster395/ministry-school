"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseNotificationPrefs, type NotificationPrefs } from "@/lib/notification-prefs";

export async function updateProfileDetails(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const clean = (key: string, max: number) =>
    ((formData.get(key) as string | null) ?? "").trim().replace(/\s+/g, " ").slice(0, max);
  const firstName = clean("first_name", 80);
  const lastName = clean("last_name", 80);
  const phone = clean("phone", 30);
  if (!firstName || !lastName) throw new Error("Le prénom et le nom sont obligatoires.");

  const fullName = `${firstName} ${lastName}`;
  const [{ error: profileError }, { error: authError }] = await Promise.all([
    supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id),
    supabase.auth.updateUser({ data: { full_name: fullName, profile_phone: phone } }),
  ]);
  if (profileError || authError) {
    throw new Error("Impossible d’enregistrer les informations du profil.");
  }

  revalidatePath("/etudiant", "layout");
  revalidatePath("/etudiant/profil");
  revalidatePath("/enseignant/profil");
  revalidatePath("/gestion/admin/profil");
}

export async function updateNotificationPrefs(key: Exclude<keyof NotificationPrefs, "rappel_jours">, enabled: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: profile } = await supabase
    .from("profiles")
    .select("notification_prefs")
    .eq("id", user.id)
    .single();

  const current = parseNotificationPrefs(profile?.notification_prefs);
  const next = { ...current, [key]: enabled };

  const { error } = await supabase.from("profiles").update({ notification_prefs: next }).eq("id", user.id);
  if (error) throw new Error("Impossible d'enregistrer cette préférence : " + error.message);

  revalidatePath("/etudiant/preferences");
}

/** Moment du rappel : 1, 3 ou 7 jours avant la journée. */
export async function updateReminderDays(days: 1 | 3 | 7) {
  if (days !== 1 && days !== 3 && days !== 7) throw new Error("Valeur non valide");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: profile } = await supabase.from("profiles").select("notification_prefs").eq("id", user.id).single();
  const next = { ...parseNotificationPrefs(profile?.notification_prefs), rappel_jours: days };
  const { error } = await supabase.from("profiles").update({ notification_prefs: next }).eq("id", user.id);
  if (error) throw new Error("Impossible d'enregistrer cette préférence : " + error.message);

  revalidatePath("/etudiant/preferences");
}
