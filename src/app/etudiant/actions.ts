"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Retient que la personne a vu le message de bienvenue : il ne s'affichera plus, quel que soit l'appareil. */
export async function markWelcomeSeen() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("profiles").update({ welcome_seen_at: new Date().toISOString() }).eq("id", user.id);
}

export async function markNotificationsSeen() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({ notifications_seen_at: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/etudiant");
  revalidatePath("/etudiant/messages");
}
