"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseNotificationPrefs, type NotificationPrefs } from "@/lib/notification-prefs";

export async function updateNotificationPrefs(key: keyof NotificationPrefs, enabled: boolean) {
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

  revalidatePath("/etudiant/profil");
}
