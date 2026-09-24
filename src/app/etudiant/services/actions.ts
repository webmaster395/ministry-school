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
  const intent = text("intent");
  const isDraft = intent === "draft" || formData.get("registration_open") === "0";
  const referentId = text("referent_id");
  const place = text("place") || "MLK Studio";
  const roomText = text("room");
  const room = [place, roomText].filter(Boolean).join(" · ");
  const rawDates = formData.getAll("dates").map(String).filter(Boolean).sort();
  const startsOn = rawDates[0] || text("starts_on") || null;
  const endsOn = rawDates[rawDates.length - 1] || text("ends_on") || null;
  const objectives = text("objectives") || null;
  const prerequisites = text("prerequisites") || null;

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = me?.role === "admin";

  // Seul un administrateur peut publier directement à la création.
  // Une proposition faite par un chef de projet ou responsable de service reste non publiée
  // (registration_open = false) jusqu'à validation par un administrateur.
  const registrationOpen = isAdmin ? !isDraft : false;
  const isValidated = isAdmin && !isDraft;

  const payload: Record<string, unknown> = {
    kind,
    title: text("title"),
    description: text("description"),
    service_id: text("service_id") || null,
    organizer_label: text("organizer_label") || null,
    schedule_label: text("schedule_label") || null,
    starts_on: startsOn,
    ends_on: endsOn,
    capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : null,
    registration_open: registrationOpen,
    created_by: user.id,
    objectives,
    prerequisites,
  };

  const payloadWithMeta = isValidated
    ? { ...payload, is_validated: true, validated_at: new Date().toISOString(), validated_by: user.id }
    : { ...payload, is_validated: false };

  let insertRes = referentId
    ? await supabase.from("opportunities").insert({ ...payloadWithMeta, referent_id: referentId }).select("id").single()
    : await supabase.from("opportunities").insert(payloadWithMeta).select("id").single();

  if (insertRes.error && (insertRes.error.code === "42703" || insertRes.error.code === "PGRST204" || insertRes.error.message.includes("is_validated") || insertRes.error.message.includes("referent_id"))) {
    insertRes = await supabase.from("opportunities").insert(payload).select("id").single();
  }

  if (insertRes.error) {
    throw new Error("La proposition a échoué : " + insertRes.error.message);
  }

  const oppId = insertRes.data.id;

  // Enregistrement des dates si fournies
  if (rawDates.length > 0) {
    await supabase.from("opportunity_dates").insert(
      rawDates.map((d) => ({
        opportunity_id: oppId,
        session_date: d,
        start_time: "14:00",
        end_time: "17:00",
        room,
      }))
    );
  }

  revalidatePath("/etudiant/services");
  const slug = kind === "projet" ? "projets" : "services";
  revalidatePath(`/gestion/${slug}`);
  redirect(`/gestion/${slug}/${oppId}`);
}

/** Valide et publie une proposition (action réservée aux administrateurs). */
export async function validateOpportunity(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") throw new Error("Seul un administrateur peut valider une proposition.");

  const id = formData.get("opportunity_id") as string;
  if (!id) throw new Error("Proposition introuvable");

  const payload: Record<string, unknown> = {
    registration_open: true,
    is_validated: true,
    validated_at: new Date().toISOString(),
    validated_by: user.id,
  };

  let res = await supabase.from("opportunities").update(payload).eq("id", id);
  if (res.error && (res.error.code === "PGRST204" || res.error.code === "42703" || res.error.message.includes("is_validated"))) {
    res = await supabase.from("opportunities").update({ registration_open: true }).eq("id", id);
  }
  if (res.error) throw new Error("Échec de la validation : " + res.error.message);

  revalidatePath("/etudiant/services");
  revalidatePath(`/etudiant/services/${id}`);
  revalidatePath("/gestion/services");
  revalidatePath("/gestion/projets");
  revalidatePath(`/gestion/services/${id}`);
  revalidatePath(`/gestion/projets/${id}`);
  revalidatePath("/gestion/admin");
}

/** Ouvre ou ferme les inscriptions. Un non-admin ne peut ouvrir que si l'opportunité a été validée. */
export async function setRegistrationOpen(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const id = formData.get("opportunity_id") as string;
  const open = formData.get("open") === "1";

  const [{ data: me }, { data: opp }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase.from("opportunities").select("registration_open, created_by").eq("id", id).single(),
  ]);

  const isAdmin = me?.role === "admin";
  const isOwner = opp?.created_by === user.id;
  if (!isAdmin && !isOwner) throw new Error("Action non autorisée.");

  // Seul un administrateur peut ouvrir les inscriptions ou valider la proposition
  if (open && !isAdmin) {
    throw new Error("Seul un administrateur peut valider et ouvrir les inscriptions d'une proposition.");
  }

  await supabase.from("opportunities").update({ registration_open: open }).eq("id", id);

  revalidatePath("/etudiant/services");
  revalidatePath(`/etudiant/services/${id}`);
  revalidatePath("/gestion/services");
  revalidatePath("/gestion/projets");
  revalidatePath(`/gestion/services/${id}`);
  revalidatePath(`/gestion/projets/${id}`);
  revalidatePath("/gestion/admin");
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
