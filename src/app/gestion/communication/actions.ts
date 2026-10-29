"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";

export type CommunicationState = { error?: string; success?: boolean };

type As = "admin" | "steering";

/**
 * Envoie un message au nom d'une fonction. Chacun n'écrit qu'à son périmètre :
 * Admin → toute la promotion ou un ministère ; Pilotage → son ministère.
 * L'application refuse d'abord avec un message clair, puis la base refuse de toute façon (RLS)
 * si quelqu'un contourne l'écran.
 */
export async function sendCommunication(_prev: CommunicationState, formData: FormData): Promise<CommunicationState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Vous n'êtes plus connecté." };

  const as = ((formData.get("as") as string) ?? "") as As;
  const target = ((formData.get("target") as string) ?? "").trim();
  const title = ((formData.get("title") as string) ?? "").trim();
  const body = ((formData.get("body") as string) ?? "").trim();
  if (!title || !body) return { error: "Renseignez l'objet et le message." };
  if (!target) return { error: "Choisissez à qui envoyer le message." };

  const allowed: Record<As, boolean> = {
    admin: viewer.roles.admin,
    steering: viewer.roles.steeringMinistryIds.length > 0,
  };
  if (!allowed[as]) return { error: "Vous n'avez pas cette fonction." };

  const row: Record<string, unknown> = { author_id: viewer.id, title, body, sent_as: as };
  const [kind, id] = target.split(":");

  if (target === "all") {
    if (as !== "admin") return { error: "Seul un Admin écrit à toute la promotion." };
  } else if (kind === "ministry") {
    if (as === "admin") row.ministry_id = id;
    else if (as === "steering" && viewer.roles.steeringMinistryIds.includes(id)) row.ministry_id = id;
    else return { error: "Ce ministère n'est pas dans votre périmètre." };
  } else {
    return { error: "Destinataires non valides." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert(row);
  if (error) {
    return {
      error: error.message.includes("row-level security")
        ? "Vous n'avez pas le droit d'écrire à ces destinataires."
        : "L'envoi a échoué : " + error.message,
    };
  }

  revalidatePath("/gestion/communication");
  revalidatePath("/etudiant");
  revalidatePath("/etudiant/messages");
  return { success: true };
}

export async function deleteCommunication(formData: FormData) {
  const supabase = await createClient();
  const id = (formData.get("announcement_id") as string) ?? "";
  // La base ne supprime que les messages de leur auteur
  await supabase.from("announcements").delete().eq("id", id);
  revalidatePath("/gestion/communication");
  revalidatePath("/etudiant/messages");
}
