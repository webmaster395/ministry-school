"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Ajoute un support (lien) à une séance du ministère piloté. La base vérifie le droit d'écriture. */
export async function addSupport(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const text = (key: string) => ((formData.get(key) as string) ?? "").trim();
  const sessionId = text("session_id");

  const { error } = await supabase.from("materials").insert({
    session_id: sessionId,
    title: text("title"),
    link_url: text("link_url") || null,
    created_by: user.id,
  });
  if (error) throw new Error("L'ajout du support a échoué : " + error.message);

  revalidatePath(`/etudiant/preparation/${sessionId}`);
  revalidatePath("/etudiant/pilotage");
  revalidatePath("/etudiant", "layout");
}

/** Ajoute une consigne (« à préparer avant le cours »). */
export async function addPilotAssignment(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const text = (key: string) => ((formData.get(key) as string) ?? "").trim();
  const sessionId = text("session_id");
  const duration = parseInt(text("duration_min"), 10);
  const due = text("due_at");

  const { error } = await supabase.from("assignments").insert({
    session_id: sessionId,
    instructions: text("instructions"),
    created_by: user.id,
    kind: text("kind") || null,
    duration_min: Number.isFinite(duration) && duration > 0 ? duration : null,
    due_at: due ? new Date(due).toISOString() : null,
  });
  if (error) throw new Error("L'ajout de la consigne a échoué : " + error.message);

  revalidatePath(`/etudiant/preparation/${sessionId}`);
  revalidatePath("/etudiant/pilotage");
  revalidatePath("/etudiant", "layout");
}
