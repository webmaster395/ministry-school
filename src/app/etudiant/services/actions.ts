"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { opportunityEmoji } from "@/lib/opportunity-banner";
import { strategicAxesComplete, type StrategicAxis } from "@/lib/opportunity-strategy";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const list = (formData: FormData, key: string) =>
  formData.getAll(key).map(String).map((value) => value.trim()).filter(Boolean).join("\n");

function strategyFrom(formData: FormData) {
  const allowed = new Set<StrategicAxis>(["former", "auberge", "fundraising"]);
  const axes = [...new Set(formData.getAll("strategic_axes").map(String))]
    .filter((axis): axis is StrategicAxis => allowed.has(axis as StrategicAxis));
  if (!strategicAxesComplete({
    title: text(formData, "title") || "Initiative",
    is_project: true,
    is_training: false,
    strategic_axes: axes,
  })) {
    throw new Error("Sélectionnez au moins un axe stratégique MLK.");
  }
  return { axes };
}

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
  const requestedPublishedAt = status === "scheduled" ? new Date(publicationInput).toISOString() : null;
  const requiresReview = status === "published" || status === "scheduled";
  const strategy = strategyFrom(formData);
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
  const internalMaterial = list(formData, "organization_material_items");
  if (internalMaterial) {
    const { data: canManageInternalMaterial } = await supabase.rpc("can_review_editorial_content");
    if (!canManageInternalMaterial) throw new Error("Le matériel d’organisation est réservé à Nathalie et Flora.");
  }
  const creationToken = text(formData, "creation_token");
  if (!creationToken) throw new Error("Rechargez le formulaire avant de créer l’élément.");
  const { data: claim, error: claimError } = await supabase.rpc("claim_opportunity_creation", { p_token: creationToken });
  if (claimError?.message.includes("CREATION_IN_PROGRESS")) throw new Error("La création est déjà en cours. Patientez quelques secondes.");
  if (claimError) throw new Error("La création n’a pas pu être sécurisée : " + claimError.message);
  const existingId = (claim as { opportunity_id?: string | null } | null)?.opportunity_id;
  if (existingId) redirect(`/gestion/projets-formations/${existingId}`);
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
      publication_status: requiresReview ? "draft" : status,
      published_at: null,
      strategic_axes: strategy.axes,
      // Compatibilité avec l'ancienne RPC ; ces marqueurs sont effacés juste après la création.
      strategic_contribution_former: strategy.axes.includes("former") ? "Axe sélectionné" : null,
      strategic_contribution_auberge: strategy.axes.includes("auberge") ? "Axe sélectionné" : null,
      strategic_contribution_fundraising: strategy.axes.includes("fundraising") ? "Axe sélectionné" : null,
      strategic_axes_connection: strategy.axes.length > 1 ? "Axes sélectionnés" : null,
    },
    p_dates: dates,
    p_managers: formData.getAll("manager_ids").map(String),
    p_contributors: formData.getAll("contributor_ids").map(String),
  });
  if (error) throw new Error("La création a échoué : " + error.message);
  const id = String(data);
  const { error: bannerError } = await supabase.from("opportunities").update({
    banner_emoji: opportunityEmoji(text(formData, "banner_emoji")),
    strategic_contribution_former: null,
    strategic_contribution_auberge: null,
    strategic_contribution_fundraising: null,
    strategic_axes_connection: null,
  }).eq("id", id);
  if (bannerError) throw new Error("La bannière n’a pas pu être enregistrée : " + bannerError.message);
  const { error: bindError } = await supabase.rpc("bind_opportunity_creation", { p_token: creationToken, p_opportunity: id });
  if (bindError) throw new Error("La création a réussi, mais son verrou anti-doublon n’a pas pu être finalisé : " + bindError.message);
  if (internalMaterial) {
    const { error: internalError } = await supabase.rpc("set_opportunity_internal_material", {
      p_opportunity: id,
      p_organization_material: internalMaterial,
    });
    if (internalError) throw new Error("Le matériel nécessaire à l’atelier n’a pas pu être enregistré : " + internalError.message);
  }
  await supabase.from("opportunity_dates").update({ capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : null }).eq("opportunity_id", id);
  if (requiresReview) {
    const { error: reviewError } = await supabase.rpc("request_opportunity_review", {
      p_opportunity: id,
      p_desired_status: status,
      p_desired_at: requestedPublishedAt,
    });
    if (reviewError) throw new Error("La demande de validation n’a pas pu être envoyée : " + reviewError.message);
  }
  refreshOpportunity(id);
  redirect(`/gestion/projets-formations/${id}?creation=ok`);
}

/** Enregistre l'une des deux validations éditoriales obligatoires. */
export async function validateOpportunity(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const id = formData.get("opportunity_id") as string;
  if (!id) throw new Error("Proposition introuvable");
  const { error } = await supabase.rpc("review_opportunity", { p_opportunity: id, p_decision: "approve", p_message: null });
  if (error?.message.includes("FORBIDDEN")) throw new Error("Cette validation est réservée à Nathalie Boudehent et Flora Demerle.");
  if (error) throw new Error("Échec de la validation : " + error.message);

  revalidatePath("/etudiant/services");
  revalidatePath(`/etudiant/services/${id}`);
  revalidatePath("/gestion/services");
  revalidatePath("/gestion/projets");
  revalidatePath(`/gestion/services/${id}`);
  revalidatePath(`/gestion/projets/${id}`);
  revalidatePath("/gestion/admin");
}

export type RejectState = { error?: string; success?: boolean };

export async function decideOpportunityReview(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const id = text(formData, "opportunity_id");
  const decision = text(formData, "decision");
  const message = text(formData, "message");
  const { error } = await supabase.rpc("review_opportunity", {
    p_opportunity: id,
    p_decision: decision,
    p_message: message || null,
  });
  if (error?.message.includes("MESSAGE_REQUIRED")) throw new Error("Précisez les corrections attendues.");
  if (error?.message.includes("FORBIDDEN")) throw new Error("Vous ne faites pas partie des deux valideuses.");
  if (error) throw new Error("La décision n’a pas pu être enregistrée : " + error.message);
  refreshOpportunity(id);
}

export async function requestOpportunityContribution(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const id = text(formData, "opportunity_id");
  const message = text(formData, "message");
  if (!message) throw new Error("Précisez le complément attendu.");
  const { error } = await supabase.rpc("request_opportunity_contribution", { p_opportunity: id, p_message: message });
  if (error) throw new Error("La demande n’a pas pu être envoyée : " + error.message);
  refreshOpportunity(id);
}

const RESOURCE_MIME_TYPES = new Set([
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv", "image/jpeg", "image/png", "image/webp", "application/zip",
]);

export async function addOpportunityResource(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const opportunityId = text(formData, "opportunity_id");
  const title = text(formData, "title");
  const kind = text(formData, "kind");
  if (!title) throw new Error("Donnez un nom au support ou à la ressource.");
  if (!["support", "resource", "link"].includes(kind)) throw new Error("Type de ressource invalide.");

  let externalUrl: string | null = null;
  let filePath: string | null = null;
  let fileName: string | null = null;
  let mimeType: string | null = null;

  if (kind === "link") {
    const rawUrl = text(formData, "external_url");
    try {
      const parsed = new URL(rawUrl);
      if (!(parsed.protocol === "https:" || parsed.protocol === "http:")) throw new Error();
      externalUrl = parsed.toString();
    } catch {
      throw new Error("Saisissez un lien web valide commençant par https://.");
    }
  } else {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new Error("Sélectionnez un fichier.");
    if (file.size > 25 * 1024 * 1024) throw new Error("Le fichier ne doit pas dépasser 25 Mo.");
    if (!RESOURCE_MIME_TYPES.has(file.type)) throw new Error("Ce format de fichier n’est pas autorisé.");
    const extension = file.name.includes(".") ? `.${file.name.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "")}` : "";
    filePath = `${opportunityId}/${crypto.randomUUID()}${extension}`;
    fileName = file.name;
    mimeType = file.type;
    const { error: uploadError } = await supabase.storage.from("opportunity-resources").upload(filePath, file, { contentType: file.type });
    if (uploadError) throw new Error("Le fichier n’a pas pu être déposé : " + uploadError.message);
  }

  const { error } = await supabase.from("opportunity_resources").insert({
    opportunity_id: opportunityId,
    title,
    kind,
    external_url: externalUrl,
    file_path: filePath,
    file_name: fileName,
    mime_type: mimeType,
    created_by: user.id,
  });
  if (error) {
    if (filePath) await supabase.storage.from("opportunity-resources").remove([filePath]);
    throw new Error("La ressource n’a pas pu être ajoutée : " + error.message);
  }
  refreshOpportunity(opportunityId);
}

export async function deleteOpportunityResource(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const opportunityId = text(formData, "opportunity_id");
  const resourceId = text(formData, "resource_id");
  const { data: resource } = await supabase.from("opportunity_resources").select("file_path").eq("id", resourceId).eq("opportunity_id", opportunityId).single();
  const { data: removed, error } = await supabase.from("opportunity_resources").delete().eq("id", resourceId).eq("opportunity_id", opportunityId).select("id");
  if (error) throw new Error("La ressource n’a pas pu être supprimée.");
  if (!removed?.length) throw new Error("Vous n’avez pas le droit de supprimer cette ressource.");
  if (resource?.file_path) await supabase.storage.from("opportunity-resources").remove([resource.file_path]);
  refreshOpportunity(opportunityId);
}

/** Rejette ou demande des modifications sur une proposition (action réservée aux administrateurs). */
export async function rejectOpportunity(_prev: RejectState, formData: FormData): Promise<RejectState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

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
    const { error } = await supabase.rpc("review_opportunity", {
      p_opportunity: id,
      p_decision: "changes_requested",
      p_message: reason || null,
    });
    if (error?.message.includes("MESSAGE_REQUIRED")) return { error: "Précisez les corrections attendues." };
    if (error?.message.includes("FORBIDDEN")) return { error: "Cette décision est réservée aux deux valideuses." };
    if (error) return { error: "La demande de corrections a échoué : " + error.message };

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
  const strategy = strategyFrom(formData);
  const parsedCapacity = Number.parseInt(text(formData, "capacity"), 10);
  const capacity = Number.isFinite(parsedCapacity) && parsedCapacity > 0 ? parsedCapacity : null;
  const { error } = await supabase.rpc("update_opportunity_content", {
    p_opportunity: id,
    p_description: text(formData, "description"),
    p_objectives: list(formData, "objectives_items") || text(formData, "objectives"),
    p_speakers: list(formData, "speakers_items") || text(formData, "speakers"),
    p_prerequisites: list(formData, "prerequisites_items") || text(formData, "prerequisites"),
    p_organization_material: list(formData, "organization_material_items"),
    p_participant_material: list(formData, "participant_material_items") || text(formData, "participant_material"),
    p_capacity: capacity,
    p_strategic_axes: strategy.axes,
    p_strategic_contribution_former: null,
    p_strategic_contribution_auberge: null,
    p_strategic_contribution_fundraising: null,
    p_strategic_axes_connection: null,
  });
  if (error?.message.includes("STRATEGIC_")) throw new Error("Sélectionnez au moins un axe stratégique MLK.");
  if (error) throw new Error("La modification a échoué : " + error.message);
  refreshOpportunity(id);
}

export type OpportunityFormState = { ok: boolean; message: string } | null;

export async function saveOpportunityContent(_previous: OpportunityFormState, formData: FormData): Promise<OpportunityFormState> {
  try {
    await updateOpportunityContent(formData);
    return { ok: true, message: "Le contenu et les besoins d’organisation ont été enregistrés." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "L’enregistrement a échoué." };
  }
}

/** Organisation et publication : responsable affecté ou administrateur, vérifié par RLS. */
export async function updateOpportunityManagement(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const id = text(formData, "opportunity_id");
  const { data: canManage } = await supabase.rpc("can_submit_opportunity", { p_opportunity: id });
  if (!canManage) throw new Error("Seul un responsable peut modifier l’organisation ou soumettre cet élément.");
  const type = text(formData, "type");
  const status = text(formData, "publication_status");
  if (!(["projet", "formation", "both"] as string[]).includes(type)) throw new Error("Type invalide.");
  if (!(["draft", "published", "scheduled", "unpublished", "archived"] as string[]).includes(status)) throw new Error("État de publication invalide.");
  if (status === "scheduled" && !text(formData, "published_at")) throw new Error("Choisissez la date de publication programmée.");
  const requestedAt = status === "scheduled" ? new Date(text(formData, "published_at")).toISOString() : null;
  const { data: current } = await supabase.from("opportunities").select("publication_status,published_at,title,is_project,is_training,strategic_axes,strategic_contribution_former,strategic_contribution_auberge,strategic_contribution_fundraising,strategic_axes_connection").eq("id", id).single();
  if ((status === "published" || status === "scheduled") && (!current || !strategicAxesComplete(current as Parameters<typeof strategicAxesComplete>[0]))) {
    throw new Error("Sélectionnez au moins un axe stratégique avant de demander la publication.");
  }
  const scheduledChanged = status === "scheduled"
    && new Date(requestedAt!).getTime() !== new Date(current?.published_at ?? 0).getTime();
  const requiresReview = (status === "published" || status === "scheduled")
    && (current?.publication_status !== status || scheduledChanged);
  const directStatus = requiresReview
    ? (current?.publication_status === "published" ? "published" : "draft")
    : status;
  const directPublishedAt = directStatus === "published" || directStatus === "scheduled" ? current?.published_at ?? null : null;
  const serviceName = text(formData, "service_name");
  const { data: serviceId, error: serviceError } = serviceName
    ? await supabase.rpc("resolve_service_name", { p_name: serviceName })
    : { data: null, error: null };
  if (serviceError) throw new Error("Le service pilote n’a pas pu être enregistré : " + serviceError.message);
  const { data: updated, error } = await supabase.from("opportunities").update({
    kind: type === "formation" ? "formation" : "projet",
    is_project: type === "projet" || type === "both",
    is_training: type === "formation" || type === "both",
    title: text(formData, "title"),
    service_id: serviceId || null,
    organizer_label: serviceName || null,
    location: text(formData, "location") || null,
    registration_open: formData.get("registration_open") === "on",
    cancellation_allowed: formData.get("cancellation_allowed") === "on",
    publication_status: directStatus,
    published_at: directPublishedAt,
    archived_at: directStatus === "archived" ? new Date().toISOString() : null,
    banner_emoji: opportunityEmoji(text(formData, "banner_emoji")),
    updated_at: new Date().toISOString(),
  }).eq("id", id).select("id");
  if (error) throw new Error("La modification a échoué : " + error.message);
  if (!updated?.length) throw new Error("Vous n’avez pas le droit de modifier ce projet ou cette formation.");
  if (requiresReview) {
    const { error: reviewError } = await supabase.rpc("request_opportunity_review", {
      p_opportunity: id,
      p_desired_status: status,
      p_desired_at: requestedAt,
    });
    if (reviewError) throw new Error("La demande de validation n’a pas pu être envoyée : " + reviewError.message);
  } else if (!["published", "scheduled"].includes(status)) {
    await supabase.rpc("cancel_opportunity_review", { p_opportunity: id });
  }
  refreshOpportunity(id);
}

export async function saveOpportunityManagement(_previous: OpportunityFormState, formData: FormData): Promise<OpportunityFormState> {
  try {
    await updateOpportunityManagement(formData);
    return { ok: true, message: "Les informations générales ont été enregistrées." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "L’enregistrement a échoué." };
  }
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

/** Sauvegarde la fiche éditée en place en réutilisant les trois traitements existants. */
export async function saveOpportunityInline(_previous: OpportunityFormState, formData: FormData): Promise<OpportunityFormState> {
  try {
    await updateOpportunityContent(formData);
    await replaceOpportunityDates(formData);
    // Un contributeur autorisé peut préparer le contenu, mais jamais gérer la publication.
    const supabase = await createClient();
    const id = text(formData, "opportunity_id");
    const { data: canManage } = await supabase.rpc("can_submit_opportunity", { p_opportunity: id });
    if (canManage) await updateOpportunityManagement(formData);
    return { ok: true, message: "Les modifications ont été enregistrées." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "L’enregistrement a échoué." };
  }
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

export async function setOpportunityContributorAccess(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const id = text(formData, "opportunity_id");
  const { error } = await supabase.rpc("set_opportunity_contributor_access", {
    p_opportunity: id,
    p_contributor: text(formData, "contributor_id"),
    p_can_edit: text(formData, "can_edit") === "1",
  });
  if (error) throw new Error("Le niveau d’accès n’a pas pu être modifié : " + error.message);
  refreshOpportunity(id);
}

export async function requestOpportunityArchive(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const id = text(formData, "opportunity_id");
  const { error } = await supabase.rpc("request_opportunity_archive", { p_opportunity: id });
  if (error) throw new Error("La demande d’archivage n’a pas pu être enregistrée : " + error.message);
  refreshOpportunity(id);
}

/** Suppression complète réservée à la Super administration, avec vérification SQL. */
export async function deleteOpportunity(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const id = text(formData, "opportunity_id");
  const { data: resources } = await supabase.from("opportunity_resources").select("file_path").eq("opportunity_id", id);
  const filePaths = (resources ?? []).flatMap((resource) => resource.file_path ? [resource.file_path] : []);
  const { error } = await supabase.rpc("delete_opportunity_admin", { p_opportunity: id });
  if (error?.message.includes("FORBIDDEN")) throw new Error("La suppression définitive est réservée à la Super administration.");
  if (error) throw new Error("La suppression a échoué : " + error.message);
  if (filePaths.length) await supabase.storage.from("opportunity-resources").remove(filePaths);
  revalidatePath("/gestion/projets-formations");
  revalidatePath("/etudiant/services");
  revalidatePath("/etudiant/messages");
  redirect("/gestion/projets-formations");
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
