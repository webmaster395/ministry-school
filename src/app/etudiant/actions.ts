"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { EMPTY_MLK_ENGAGEMENT } from "@/lib/mlk-engagement";

export type EngagementState = { success?: boolean; error?: string };

export async function saveMlkEngagement(
  _previous: EngagementState,
  formData: FormData
): Promise<EngagementState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu dois être connecté(e)." };

  const none = formData.get("none") === "on";
  const equipier = formData.get("equipier") === "on";
  const manager = formData.get("manager") === "on";
  const collaborator = formData.get("collaborator") === "on";
  if (!none && !equipier && !manager && !collaborator) {
    return { error: "Sélectionne au moins une réponse." };
  }

  const { data: serviceRows } = await supabase.from("services").select("id");
  const allowed = new Set((serviceRows ?? []).map((service: { id: string }) => service.id));
  const serviceIds = (key: string) =>
    formData.getAll(key).filter((id): id is string => typeof id === "string" && allowed.has(id));

  const { data: profile } = await supabase
    .from("profiles")
    .select("notification_prefs")
    .eq("id", user.id)
    .single();
  const current = ((profile?.notification_prefs ?? {}) as Record<string, unknown>);
  const mlkEngagement = none
    ? { ...EMPTY_MLK_ENGAGEMENT, completed: true, none: true }
    : {
        completed: true,
        none: false,
        equipier,
        manager,
        collaborator,
        equipierServiceIds: equipier ? serviceIds("equipier_services") : [],
        managerServiceIds: manager ? serviceIds("manager_services") : [],
      };

  const { error } = await supabase
    .from("profiles")
    .update({ notification_prefs: { ...current, mlk_engagement: mlkEngagement } })
    .eq("id", user.id);
  if (error) return { error: "Ces informations n’ont pas pu être enregistrées." };

  revalidatePath("/etudiant", "layout");
  revalidatePath("/gestion/admin");
  return { success: true };
}

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
