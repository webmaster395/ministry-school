"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** S'inscrire ou se désinscrire d'une formation / d'un projet. */
export async function toggleRegistration(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const id = formData.get("opportunity_id") as string;
  const registered = formData.get("registered") === "1";

  if (registered) {
    await supabase
      .from("opportunity_registrations")
      .delete()
      .eq("opportunity_id", id)
      .eq("user_id", user.id);
  } else {
    const { error } = await supabase
      .from("opportunity_registrations")
      .insert({ opportunity_id: id, user_id: user.id });
    if (error) {
      throw new Error("Inscription impossible : plus de place ou inscriptions fermées.");
    }
  }

  revalidatePath("/etudiant/services");
  revalidatePath(`/etudiant/services/${id}`);
  revalidatePath("/gestion/services");
  revalidatePath("/gestion/projets");
  revalidatePath(`/gestion/services/${id}`);
  revalidatePath(`/gestion/projets/${id}`);
}

/** Propose une formation (responsable de service) ou un projet (chef de projet). */
export async function createOpportunity(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const text = (key: string) => ((formData.get(key) as string) ?? "").trim();
  const kind = text("kind") === "projet" ? "projet" : "formation";
  const capacity = parseInt(text("capacity"), 10);

  const { data, error } = await supabase
    .from("opportunities")
    .insert({
      kind,
      title: text("title"),
      description: text("description"),
      service_id: text("service_id") || null,
      organizer_label: text("organizer_label") || null,
      schedule_label: text("schedule_label") || null,
      starts_on: text("starts_on") || null,
      ends_on: text("ends_on") || null,
      capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : null,
      registration_open: formData.get("registration_open") === "on",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error("La proposition a échoué : " + error.message);
  }

  revalidatePath("/etudiant/services");
  const slug = kind === "projet" ? "projets" : "services";
  revalidatePath(`/gestion/${slug}`);
  redirect(`/gestion/${slug}/${data.id}`);
}

/** Ouvre ou ferme les inscriptions (auteur ou administrateur). */
export async function setRegistrationOpen(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("opportunity_id") as string;
  const open = formData.get("open") === "1";

  await supabase.from("opportunities").update({ registration_open: open }).eq("id", id);

  revalidatePath("/etudiant/services");
  revalidatePath(`/etudiant/services/${id}`);
  revalidatePath("/gestion/services");
  revalidatePath("/gestion/projets");
  revalidatePath(`/gestion/services/${id}`);
  revalidatePath(`/gestion/projets/${id}`);
}

/** Enregistre le compte rendu dont le fichier vient d'être déposé dans le stockage (dépôt fait depuis le navigateur). */
export async function recordReport(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const opportunityId = formData.get("opportunity_id") as string;
  const sessionDate = formData.get("session_date") as string;

  const { error } = await supabase.from("opportunity_reports").upsert({
    opportunity_id: opportunityId,
    session_date: sessionDate,
    file_path: formData.get("file_path") as string,
    file_name: formData.get("file_name") as string,
    submitted_by: user.id,
    submitted_at: new Date().toISOString(),
  });
  if (error) throw new Error("L'enregistrement du compte rendu a échoué : " + error.message);

  revalidatePath(`/gestion/services/${opportunityId}`);
  revalidatePath(`/gestion/projets/${opportunityId}`);
  revalidatePath("/gestion/admin");
}
