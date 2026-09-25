"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseNotificationPrefs, type NotificationPrefs } from "@/lib/notification-prefs";

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
