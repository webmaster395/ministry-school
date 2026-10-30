"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { opportunityEmoji } from "@/lib/opportunity-banner";
import { strategicAxesComplete, type StrategicAxis } from "@/lib/opportunity-strategy";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const list = (formData: FormData, key: string) =>
  formData.getAll(key).map(String).map((value) => value.trim()).filter(Boolean).join("\n");

function opportunityDatesFrom(formData: FormData) {
  const sessionDates = formData.getAll("session_date").map(String);
  const starts = formData.getAll("start_time").map(String);
  const ends = formData.getAll("end_time").map(String);
  const rooms = formData.getAll("room").map(String);
  const locations = formData.getAll("date_location").map(String);
  const ids = formData.getAll("date_id").map(String);
  const capacities = formData.getAll("date_capacity").map(String);
  return sessionDates.map((session_date, index) => ({
    id: ids[index] || null,
    session_date,
    start_time: starts[index] || "14:00",
    end_time: ends[index] || "17:00",
    room: rooms[index] || null,
    location: locations[index] || null,
    capacity: capacities[index] || null,
  })).filter((date) => date.session_date);
}

/** Convertit une saisie datetime-local en instant UTC selon Europe/Paris, heure d'été comprise. */
function parisLocalDateTimeToIso(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Choisissez une date et une heure de publication valides.");
  const [, year, month, day, hour, minute] = match.map(Number);
  const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  let instant = desiredAsUtc;
  for (let pass = 0; pass < 2; pass += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map((part) => [part.type, part.value]));
    const representedLocal = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    instant += desiredAsUtc - representedLocal;
  }
  return new Date(instant).toISOString();
}

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

function requireOpportunityFields(formData: FormData, dates: Array<{
  session_date: string;
  start_time: string;
  end_time: string;
}> = opportunityDatesFrom(formData)) {
  const missing: string[] = [];
  const requiredText: Array<[string, string]> = [
    ["title", "nom"],
    ["service_name", "service pilote"],
    ["description", "présentation"],
    ["location", "lieu principal"],
  ];
  for (const [key, label] of requiredText) if (!text(formData, key)) missing.push(label);
  const requiredLists: Array<[string, string]> = [
    ["objectives_items", "objectifs"],
    ["speakers_items", "intervenants"],
    ["prerequisites_items", "prérequis"],
  ];
  for (const [key, label] of requiredLists) if (!list(formData, key)) missing.push(label);
  const capacity = Number.parseInt(text(formData, "capacity"), 10);
  if (!Number.isFinite(capacity) || capacity < 1) missing.push("nombre de places");
  if (!dates.length) missing.push("au moins une séance");
  if (dates.some((date) => !date.session_date || !date.start_time || !date.end_time || date.start_time >= date.end_time)) {
    missing.push("dates et horaires valides");
  }
  if (missing.length) {
    throw new Error(`Complétez les champs obligatoires suivants : ${[...new Set(missing)].join(", ")}.`);
  }
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
  requireOpportunityFields(formData, dates);

  const serviceName = text(formData, "service_name");
  const { data: serviceId, error: serviceError } = serviceName
    ? await supabase.rpc("resolve_service_name", { p_name: serviceName })
    : { data: null, error: null };
  if (serviceError) throw new Error("Le service pilote n’a pas pu être enregistré : " + serviceError.message);
  const internalMaterial = list(formData, "organization_material_items");
  if (internalMaterial) {
    const { data: canManageInternalMaterial } = await supabase.rpc("can_review_editorial_content");
    if (!canManageInternalMaterial) throw new Error("Le matériel d’organisation est réservé aux super administrateurs.");
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
      tools_used: list(formData, "tools_used_items") || null,
      schedule_label: null,
      starts_on: dates[0].session_date,
      ends_on: dates.at(-1)?.session_date ?? dates[0].session_date,
      capacity: Number.isFinite(capacity) && capacity > 0 ? capacity : null,
      registration_open: formData.get("registration_open") === "on",
      cancellation_allowed: formData.get("cancellation_allowed") === "on",
      publication_status: "draft",
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
  const { error: toolsError } = await supabase.rpc("set_opportunity_tools", {
    p_opportunity: id,
    p_tools: list(formData, "tools_used_items") || null,
  });
  if (toolsError) throw new Error("L’élément a été créé, mais les outils utilisés n’ont pas pu être enregistrés : " + toolsError.message);
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
  refreshOpportunity(id);
  redirect(`/gestion/projets-formations/${id}?creation=ok${text(formData, "return_scope") === "admin" ? "&scope=admin" : ""}`);
}

/** Compatibilité historique : validation immédiate par un super administrateur. */
export async function validateOpportunity(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const id = formData.get("opportunity_id") as string;
  if (!id) throw new Error("Proposition introuvable");
  const { error } = await supabase.rpc("review_opportunity", { p_opportunity: id, p_decision: "approve", p_message: null, p_publish_mode: "now", p_publish_at: null });
  if (error?.message.includes("FORBIDDEN")) throw new Error("Cette validation est réservée aux super administrateurs.");
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
  const publishMode = text(formData, "publish_mode") || null;
  const publishInput = text(formData, "publish_at");
  const publishAt = publishInput ? parisLocalDateTimeToIso(publishInput) : null;
  const { error } = await supabase.rpc("review_opportunity", {
    p_opportunity: id,
    p_decision: decision,
    p_message: message || null,
    p_publish_mode: publishMode,
    p_publish_at: publishAt,
  });
  if (error?.message.includes("MESSAGE_REQUIRED")) throw new Error("Précisez les corrections attendues.");
  if (error?.message.includes("INVALID_SCHEDULE")) throw new Error("Choisissez une date de publication future.");
  if (error?.message.includes("FORBIDDEN")) throw new Error("Cette décision est réservée aux super administrateurs.");
  if (error) throw new Error("La décision n’a pas pu être enregistrée : " + error.message);
  refreshOpportunity(id);
}

export async function submitOpportunityReview(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const id = text(formData, "opportunity_id");
  const { error } = await supabase.rpc("request_opportunity_review", {
    p_opportunity: id,
    p_desired_status: "published",
    p_desired_at: null,
  });
  if (error?.message.includes("FORBIDDEN")) throw new Error("Seul un responsable peut soumettre cette fiche.");
  if (error?.message.includes("REQUIRED_FIELDS:")) throw new Error(`Complétez les champs obligatoires avant la soumission : ${error.message.split("REQUIRED_FIELDS:")[1]?.split("\n")[0] ?? "fiche incomplète"}.`);
  if (error) throw new Error("La demande de validation n’a pas pu être envoyée : " + error.message);
  refreshOpportunity(id);
}

export async function saveOpportunityAgenda(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const opportunityId = text(formData, "opportunity_id");
  const dateId = text(formData, "opportunity_date_id");
  let steps: unknown;
  try { steps = JSON.parse(text(formData, "steps") || "[]"); }
  catch { throw new Error("Le déroulé transmis est invalide."); }
  const { error } = await supabase.rpc("save_opportunity_agenda", {
    p_opportunity: opportunityId,
    p_opportunity_date: dateId,
    p_steps: steps,
  });
  if (error?.message.includes("FORBIDDEN")) throw new Error("Vous n’avez pas le droit de modifier ce déroulé.");
  if (error) throw new Error("Le déroulé n’a pas pu être enregistré : " + error.message);
  refreshOpportunity(opportunityId);
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
  const { error: toolsError } = await supabase.rpc("set_opportunity_tools", {
    p_opportunity: id,
    p_tools: list(formData, "tools_used_items") || null,
  });
  if (toolsError) throw new Error("Les outils utilisés n’ont pas pu être enregistrés : " + toolsError.message);
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
  if (!(["projet", "formation", "both"] as string[]).includes(type)) throw new Error("Type invalide.");
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
    banner_emoji: opportunityEmoji(text(formData, "banner_emoji")),
    updated_at: new Date().toISOString(),
  }).eq("id", id).select("id");
  if (error) throw new Error("La modification a échoué : " + error.message);
  if (!updated?.length) throw new Error("Vous n’avez pas le droit de modifier ce projet ou cette formation.");
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
  const dates = opportunityDatesFrom(formData);
  const { error } = await supabase.rpc("replace_opportunity_dates", { p_opportunity: id, p_dates: dates });
  if (error) throw new Error("La mise à jour des séances a échoué : " + error.message);
  refreshOpportunity(id);
}

/** Sauvegarde la fiche éditée en place en réutilisant les trois traitements existants. */
export async function saveOpportunityInline(_previous: OpportunityFormState, formData: FormData): Promise<OpportunityFormState> {
  try {
    const supabase = await createClient();
    const id = text(formData, "opportunity_id");
    requireOpportunityFields(formData);
    const [{ data: canManage }, { data: isSuperAdmin }, { data: current, error: currentError }] = await Promise.all([
      supabase.rpc("can_submit_opportunity", { p_opportunity: id }),
      supabase.rpc("is_super_admin"),
      supabase.from("opportunities").select("kind,is_project,is_training,title,description,objectives,speakers,prerequisites,participant_material,tools_used,capacity,strategic_axes,service_id,organizer_label,location,registration_open,cancellation_allowed,banner_emoji,publication_status").eq("id", id).single(),
    ]);
    if (currentError || !current) throw new Error("Cette fiche est introuvable ou inaccessible.");

    // Une fiche déjà visible conserve sa version publique. Toutes les modifications
    // sont stockées dans une version de travail privée jusqu'à la prochaine validation.
    if (["published", "scheduled"].includes(current.publication_status)) {
      const strategy = strategyFrom(formData);
      const parsedCapacity = Number.parseInt(text(formData, "capacity"), 10);
      const capacity = Number.isFinite(parsedCapacity) && parsedCapacity > 0 ? parsedCapacity : null;
      const type = canManage ? text(formData, "type") : current.is_project && current.is_training ? "both" : current.is_project ? "projet" : "formation";
      if (!(type === "projet" || type === "formation" || type === "both")) throw new Error("Type invalide.");
      const serviceName = canManage ? text(formData, "service_name") : current.organizer_label;
      const { data: serviceId, error: serviceError } = canManage && serviceName
        ? await supabase.rpc("resolve_service_name", { p_name: serviceName })
        : { data: current.service_id, error: null };
      if (serviceError) throw new Error("Le service pilote n’a pas pu être enregistré : " + serviceError.message);
      const { error: revisionError } = await supabase.rpc("save_opportunity_revision", {
        p_opportunity: id,
        p_payload: {
          kind: type === "formation" ? "formation" : "projet",
          is_project: type === "projet" || type === "both",
          is_training: type === "formation" || type === "both",
          title: canManage ? text(formData, "title") : current.title,
          description: text(formData, "description"),
          objectives: list(formData, "objectives_items") || text(formData, "objectives") || null,
          speakers: list(formData, "speakers_items") || text(formData, "speakers") || null,
          prerequisites: list(formData, "prerequisites_items") || text(formData, "prerequisites") || null,
          participant_material: list(formData, "participant_material_items") || text(formData, "participant_material") || null,
          tools_used: list(formData, "tools_used_items") || null,
          capacity,
          strategic_axes: strategy.axes,
          service_id: serviceId || null,
          service_name: serviceName || null,
          organizer_label: serviceName || null,
          location: canManage ? text(formData, "location") || null : current.location,
          registration_open: canManage ? formData.get("registration_open") === "on" : current.registration_open,
          cancellation_allowed: canManage ? formData.get("cancellation_allowed") === "on" : current.cancellation_allowed,
          banner_emoji: opportunityEmoji(text(formData, "banner_emoji")),
        },
        p_dates: opportunityDatesFrom(formData),
      });
      if (revisionError?.message.includes("FORBIDDEN")) throw new Error("Vous n’avez pas le droit de modifier cette fiche.");
      if (revisionError) throw new Error("La version de travail n’a pas pu être enregistrée : " + revisionError.message);

      const internalMaterial = list(formData, "organization_material_items");
      if (formData.get("organization_material_present") === "1") {
        const { error: internalError } = await supabase.rpc("set_opportunity_internal_material", {
          p_opportunity: id,
          p_organization_material: internalMaterial,
        });
        if (internalError) throw new Error("Le matériel interne n’a pas pu être enregistré.");
      }
      if (isSuperAdmin) {
        const { error: submitError } = await supabase.rpc("request_opportunity_review", {
          p_opportunity: id,
          p_desired_status: "published",
          p_desired_at: null,
        });
        if (submitError) throw new Error("La version est enregistrée, mais sa validation n’a pas pu être ouverte.");
      }
      refreshOpportunity(id);
      return { ok: true, message: isSuperAdmin ? "La nouvelle version est enregistrée et prête à être validée. La version publiée reste inchangée." : "La version de travail est enregistrée. La version publiée reste inchangée jusqu’à validation." };
    }

    await updateOpportunityContent(formData);
    if (canManage) {
      await replaceOpportunityDates(formData);
      await updateOpportunityManagement(formData);
    }
    return { ok: true, message: "Les modifications ont été enregistrées dans le brouillon." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "L’enregistrement a échoué." };
  }
}

export async function replaceOpportunityAssignments(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const { data: isSuperAdmin } = await supabase.rpc("is_super_admin");
  if (!isSuperAdmin) throw new Error("Seuls les super administrateurs peuvent gérer les affectations.");
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
