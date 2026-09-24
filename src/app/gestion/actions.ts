"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DETAILS_ENABLED } from "@/lib/opportunity-details";
import { AFTERNOON, programDates } from "@/lib/program-dates";

export type ProposeState = { error?: string };

/**
 * Recherche de profils par nom (min. 2 caractères) pour l'autocomplete du référent de suivi.
 * Renvoie au plus 8 résultats.
 */
export async function searchProfiles(query: string): Promise<{ id: string; full_name: string }[]> {
  if (!query || query.trim().length < 2) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .ilike("full_name", `%${query.trim()}%`)
    .limit(8);
  return (data ?? []) as { id: string; full_name: string }[];
}

/**
 * Crée une formation de service ou un projet depuis la fenêtre « Nouvelle proposition » :
 * la fiche (titre, présentation, places, objectifs, prérequis) et ses dates au programme.
 * Un brouillon a ses inscriptions fermées ; « publier » les ouvre. La base vérifie le droit de proposer.
 */
export async function proposeOpportunity(_prev: ProposeState, formData: FormData): Promise<ProposeState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Vous n'êtes plus connecté." };

  const text = (key: string) => ((formData.get(key) as string) ?? "").trim();
  const list = (key: string) => formData.getAll(key).map((v) => String(v).trim()).filter(Boolean);

  const kind = text("kind") === "projet" ? "projet" : "formation";
  const draft = text("intent") === "draft";
  const title = text("title");
  const lead = text("organizer_label");
  const serviceId = text("service_id");
  const description = text("description");
  const capacity = parseInt(text("capacity"), 10);
  const allowed = new Set(programDates());
  const dates = [...new Set(formData.getAll("date").map(String))].filter((d) => allowed.has(d)).sort();
  const place = text("place") === "Autre" ? text("place_other") : text("place") || "MLK Studio";

  const referentId = text("referent_id");

  if (!title || !lead || !description || !place)
    return { error: kind === "projet"
      ? "Renseignez le titre, le chef de projet, le lieu et la présentation."
      : "Renseignez le titre, le responsable, le lieu et la présentation." };
  if (kind === "projet" && !referentId) return { error: "Sélectionnez un référent du suivi." };
  if (kind === "formation" && !serviceId) return { error: "Choisissez le service organisateur." };
  if (!dates.length) return { error: "Choisissez au moins une date." };
  if (!Number.isFinite(capacity) || capacity < 1) return { error: "Indiquez la capacité maximale." };

  const room = [place, text("room")].filter(Boolean).join(" · ");
  const noPrerequisite = formData.get("no_prerequisite") === "on";

  const { data, error } = await supabase
    .from("opportunities")
    .insert({
      kind,
      title,
      description,
      service_id: serviceId || null,
      organizer_label: lead,
      starts_on: dates[0],
      ends_on: dates[dates.length - 1],
      capacity,
      registration_open: !draft,
      created_by: user.id,
      ...(DETAILS_ENABLED && {
        objectives: list("objective").join("\n") || null,
        prerequisites: noPrerequisite ? null : list("prerequisite").join("\n") || null,
      }),
    })
    .select("id")
    .single();
  if (error) return { error: "La proposition n'a pas pu être créée : " + error.message };

  const { error: datesError } = await supabase.from("opportunity_dates").insert(
    dates.map((d) => ({
      opportunity_id: data.id,
      session_date: d,
      start_time: AFTERNOON.start,
      end_time: AFTERNOON.end,
      room,
    }))
  );
  if (datesError) {
    return { error: "La fiche est créée, mais ses dates n'ont pas pu être enregistrées : " + datesError.message };
  }

  const slug = kind === "projet" ? "projets" : "services";
  revalidatePath("/etudiant/services");
  revalidatePath(`/gestion/${slug}`);
  redirect(`/gestion/${slug}/${data.id}`);
}
