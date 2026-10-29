"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { opportunityEmoji } from "@/lib/opportunity-banner";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const list = (formData: FormData, key: string) =>
  formData.getAll(key).map(String).map((value) => value.trim()).filter(Boolean).join("\n");

function refreshOpportunity(id: string) {
  revalidatePath("/etudiant/services");
  revalidatePath(`/etudiant/services/${id}`);
  revalidatePath("/gestion/projets-formations");
  revalidatePath(`/gestion/projets-formations/${id}`);
  revalidatePath("/gestion/admin");
}

/** Inscription atomique à une ou plusieurs séances, avec capacité vérifiée sous verrou en base. */
export async function registerOpportunityDates(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const id = text(formData, "opportunity_id");
  const dates = [...new Set(formData.getAll("date_ids").map(String).filter(Boolean))];
  if (!dates.length) throw new Error("Sélectionnez au moins une séance.");
  const { error } = await supabase.rpc("register_for_opportunity_dates", { p_opportunity: id, p_dates: dates });
  if (error) {
    if (error.message.includes("CAPACITY_REACHED")) throw new Error("Une des séances sélectionnées vient d’être complétée.");
    if (error.message.includes("ALREADY_REGISTERED")) throw new Error("Vous êtes déjà inscrit à cette séance.");
    throw new Error("L’inscription n’a pas pu être enregistrée.");
  }
  refreshOpportunity(id);
}

/** Annule uniquement la séance choisie et libère immédiatement sa place. */
export async function cancelOpportunityDate(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const id = text(formData, "opportunity_id");
  const dateId = text(formData, "date_id");
  const { error } = await supabase.rpc("cancel_opportunity_date_registration", { p_date: dateId });
  if (error?.message.includes("CANCELLATION_NOT_ALLOWED")) throw new Error("L’annulation n’est pas autorisée.");
  if (error) throw new Error("L’annulation n’a pas pu être enregistrée.");
  refreshOpportunity(id);
}

/** Crée un élément complet. La fonction SQL vérifie de nouveau le rôle administrateur. */
export async function createOpportunity(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const type = text(formData, "type");
  if (!(["projet", "formation", "both"] as string[]).includes(type)) throw new Error("Type invalide.");
  const capacity = Number.parseInt(text(formData, "capacity"), 10);
  const status = text(formData, "publication_status") || "draft";
  if (!(["draft", "published", "scheduled", "unpublished"] as string[]).includes(status)) throw new Error("État de publication invalide.");
  const publicationInput = text(formData, "published_at");
  if (status === "scheduled" && !publicationInput) throw new Error("Choisissez la date de publication programmée.");
  const publishedAt = status === "published" ? new Date().toISOString() : status === "scheduled" ? new Date(publicationInput).toISOString() : null;
  const sessionDates = formData.getAll("session_date").map(String);
  const starts = formData.getAll("start_time").map(String);
  const ends = formData.getAll("end_time").map(String);
  const rooms = formData.getAll("room").map(String);
  const locations = formData.getAll("date_location").map(String);
  const dates = sessionDates.map((session_date, index) => ({
    session_date,
    start_time: starts[index] || "14:00",
    end_time: ends[index] || "17:00",
    room: rooms[index] || null,
    location: locations[index] || null,
    capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : null,
  })).filter((date) => date.session_date).sort((a, b) => a.session_date.localeCompare(b.session_date));
  if (!dates.length) throw new Error("Ajoutez au moins une date.");

  const serviceName = text(formData, "service_name");
  const { data: serviceId, error: serviceError } = serviceName
    ? await supabase.rpc("resolve_service_name", { p_name: serviceName })
    : { data: null, error: null };
  if (serviceError) throw new Error("Le service pilote n’a pas pu être enregistré : " + serviceError.message);
  const { data, error } = await supabase.rpc("create_opportunity_admin", {
    p_payload: {
      kind: type === "formation" ? "formation" : "projet",
      is_project: type === "projet" || type === "both",
      is_training: type === "formation" || type === "both",
      title: text(formData, "title"),
      short_description: null,
      description: text(formData, "description"),
      objectives: list(formData, "objectives_items") || null,
      service_id: serviceId || null,
      organizer_label: serviceName || null,
      speakers: list(formData, "speakers_items") || null,
      prerequisites: list(formData, "prerequisites_items") || null,
      location: text(formData, "location") || null,
      organization_material: null,
      participant_material: list(formData, "participant_material_items") || null,
      schedule_label: null,
      starts_on: dates[0].session_date,
      ends_on: dates.at(-1)?.session_date ?? dates[0].session_date,
      capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : null,
      registration_open: formData.get("registration_open") === "on",
      cancellation_allowed: formData.get("cancellation_allowed") === "on",
      publication_status: status,
      published_at: publishedAt,
    },
    p_dates: dates,
    p_managers: formData.getAll("manager_ids").map(String),
    p_contributors: formData.getAll("contributor_ids").map(String),
  });
  if (error) throw new Error("La création a échoué : " + error.message);
  const id = String(data);
  const { error: bannerError } = await supabase.from("opportunities").update({ banner_emoji: opportunityEmoji(text(formData, "banner_emoji")) }).eq("id", id);
  if (bannerError) throw new Error("La bannière n’a pas pu être enregistrée : " + bannerError.message);
  await supabase.from("opportunity_dates").update({ capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : null }).eq("opportunity_id", id);
  refreshOpportunity(id);
  redirect(`/gestion/projets-formations/${id}?creation=ok`);
}

/** Valide et publie une proposition (action réservée aux administrateurs). */
export async function validateOpportunity(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") throw new Error("Seul un Admin peut valider une proposition.");

  const id = formData.get("opportunity_id") as string;
  if (!id) throw new Error("Proposition introuvable");

  const payload: Record<string, unknown> = {
    registration_open: true,
    publication_status: "published",
    published_at: new Date().toISOString(),
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

export type RejectState = { error?: string; success?: boolean };

/** Rejette ou demande des modifications sur une proposition (action réservée aux administrateurs). */
export async function rejectOpportunity(_prev: RejectState, formData: FormData): Promise<RejectState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return { error: "Seul un Admin peut refuser une proposition." };

  const id = formData.get("opportunity_id") as string;
  const reason = (formData.get("reason") as string)?.trim();
  const deletePermanently = formData.get("delete_permanently") === "1";

  if (!id) return { error: "Proposition introuvable" };

  // Récupérer les informations de la proposition avant toute modification/suppression
  const { data: opp } = await supabase
    .from("opportunities")
    .select("title, kind, created_by")
    .eq("id", id)
    .maybeSingle();

  const oppKind = opp?.kind ?? "formation";
  const slug = oppKind === "projet" ? "projets" : "services";

  if (deletePermanently) {
    // Suppression complète des dates, inscriptions, comptes rendus et de la proposition
    await supabase.from("opportunity_registrations").delete().eq("opportunity_id", id);
    await supabase.from("opportunity_dates").delete().eq("opportunity_id", id);
    await supabase.from("opportunity_reports").delete().eq("opportunity_id", id);
    const { error } = await supabase.from("opportunities").delete().eq("id", id);
    if (error) return { error: "Échec de la suppression : " + error.message };

    revalidatePath("/etudiant/services");
    revalidatePath("/gestion/services");
    revalidatePath("/gestion/projets");
    revalidatePath("/gestion/admin");

    redirect(`/gestion/${slug}`);
  } else {
    // Si des colonnes de rejet existent, on les renseigne ; sinon on laisse registration_open à false
    const payload: Record<string, unknown> = {
      registration_open: false,
      is_validated: false,
      rejection_reason: reason || null,
      rejected_at: new Date().toISOString(),
      rejected_by: user.id,
    };
    const res = await supabase.from("opportunities").update(payload).eq("id", id);
    if (res.error) {
      // Fallback sans colonnes optionnelles
      await supabase.from("opportunities").update({ registration_open: false }).eq("id", id);
    }

    revalidatePath("/etudiant/services");
    revalidatePath(`/etudiant/services/${id}`);
    revalidatePath("/gestion/services");
    revalidatePath("/gestion/projets");
    revalidatePath(`/gestion/services/${id}`);
    revalidatePath(`/gestion/projets/${id}`);
    revalidatePath("/gestion/admin");

    return { success: true };
  }
}

/** Contenu éditable par un responsable ou un contributeur affecté. */
export async function updateOpportunityContent(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const id = text(formData, "opportunity_id");
  const { data: current } = await supabase.from("opportunities").select("organization_material").eq("id", id).single();
  const { error } = await supabase.rpc("update_opportunity_content", {
    p_opportunity: id,
    p_description: text(formData, "description"),
    p_objectives: list(formData, "objectives_items") || text(formData, "objectives"),
    p_speakers: list(formData, "speakers_items") || text(formData, "speakers"),
    p_prerequisites: list(formData, "prerequisites_items") || text(formData, "prerequisites"),
    p_organization_material: current?.organization_material ?? "",
    p_participant_material: list(formData, "participant_material_items") || text(formData, "participant_material"),
  });
  if (error) throw new Error("La modification a échoué : " + error.message);
  refreshOpportunity(id);
}

/** Organisation et publication : responsable affecté ou administrateur, vérifié par RLS. */
export async function updateOpportunityManagement(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const id = text(formData, "opportunity_id");
  const type = text(formData, "type");
  const status = text(formData, "publication_status");
  if (!(["projet", "formation", "both"] as string[]).includes(type)) throw new Error("Type invalide.");
  if (!(["draft", "published", "scheduled", "unpublished", "archived"] as string[]).includes(status)) throw new Error("État de publication invalide.");
  if (status === "scheduled" && !text(formData, "published_at")) throw new Error("Choisissez la date de publication programmée.");
  const capacity = Number.parseInt(text(formData, "capacity"), 10);
  const publishedAt = status === "published" ? new Date().toISOString() : status === "scheduled" ? new Date(text(formData, "published_at")).toISOString() : null;
  const serviceName = text(formData, "service_name");
  const { data: serviceId, error: serviceError } = serviceName
    ? await supabase.rpc("resolve_service_name", { p_name: serviceName })
    : { data: null, error: null };
  if (serviceError) throw new Error("Le service pilote n’a pas pu être enregistré : " + serviceError.message);
  const { error } = await supabase.from("opportunities").update({
    kind: type === "formation" ? "formation" : "projet",
    is_project: type === "projet" || type === "both",
    is_training: type === "formation" || type === "both",
    title: text(formData, "title"),
    service_id: serviceId || null,
    organizer_label: serviceName || null,
    location: text(formData, "location") || null,
    capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : null,
    registration_open: formData.get("registration_open") === "on",
    cancellation_allowed: formData.get("cancellation_allowed") === "on",
    publication_status: status,
    published_at: publishedAt,
    archived_at: status === "archived" ? new Date().toISOString() : null,
    banner_emoji: opportunityEmoji(text(formData, "banner_emoji")),
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) throw new Error("La modification a échoué : " + error.message);
  await supabase.from("opportunity_dates").update({ capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : null }).eq("opportunity_id", id);
  refreshOpportunity(id);
}

export async function replaceOpportunityDates(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const id = text(formData, "opportunity_id");
  const sessionDates = formData.getAll("session_date").map(String);
  const starts = formData.getAll("start_time").map(String);
  const ends = formData.getAll("end_time").map(String);
  const rooms = formData.getAll("room").map(String);
  const locations = formData.getAll("date_location").map(String);
  const ids = formData.getAll("date_id").map(String);
  const capacities = formData.getAll("date_capacity").map(String);
  const dates = sessionDates.map((session_date, index) => ({
    id: ids[index] || null,
    session_date,
    start_time: starts[index] || "14:00",
    end_time: ends[index] || "17:00",
    room: rooms[index] || null,
    location: locations[index] || null,
    capacity: capacities[index] || null,
  })).filter((date) => date.session_date);
  const { error } = await supabase.rpc("replace_opportunity_dates", { p_opportunity: id, p_dates: dates });
  if (error) throw new Error("La mise à jour des séances a échoué : " + error.message);
  refreshOpportunity(id);
}

export async function replaceOpportunityAssignments(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const id = text(formData, "opportunity_id");
  const { error } = await supabase.rpc("replace_opportunity_assignments", {
    p_opportunity: id,
    p_managers: formData.getAll("manager_ids").map(String),
    p_contributors: formData.getAll("contributor_ids").map(String),
  });
  if (error) throw new Error("La mise à jour des affectations a échoué : " + error.message);
  refreshOpportunity(id);
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
    supabase.from("opportunities").select("registration_open, created_by, lead_id").eq("id", id).single(),
  ]);

  const isAdmin = me?.role === "admin";
  const isOwner = opp?.created_by === user.id || opp?.lead_id === user.id;
  if (!isAdmin && !isOwner) throw new Error("Action non autorisée.");

  // Seul un administrateur peut ouvrir les inscriptions ou valider la proposition
  if (open && !isAdmin) {
    throw new Error("Seul un Admin peut valider et ouvrir les inscriptions d'une proposition.");
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
