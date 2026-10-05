import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type NotificationScope =
  | { session_id: string; ministry_id?: never }
  | { ministry_id: string; session_id?: never };

type NotifyCourseContentOptions = {
  supabase: SupabaseClient;
  actorId: string;
  sessionId: string;
  targetId?: string | null;
  contentTitle?: string | null;
  scope?: NotificationScope;
  availability?: "now" | "start" | "end";
};

/**
 * Crée une communication système uniquement lorsqu'un support est ajouté.
 * Les ressources ajoutées par une même personne au même cours dans un intervalle court
 * sont regroupées afin de ne pas saturer la messagerie des étudiants.
 */
export async function notifyCourseContent({
  supabase,
  actorId,
  sessionId,
  targetId,
  contentTitle,
  scope,
  availability = "now",
}: NotifyCourseContentOptions) {
  try {
    const { data: session } = await supabase
      .from("sessions")
      .select("description, session_date")
      .eq("id", sessionId)
      .single();
    if (!session) return;

    const course = session.description || "votre cours";
    const date = new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
    }).format(new Date(`${session.session_date}T00:00:00`));
    const targetUrl = `/etudiant/seances/${sessionId}#course-resources`;
    const targetScope: NotificationScope = scope ?? { session_id: sessionId };

    const title = contentTitle
      ? `Nouvelle ressource : ${contentTitle}`
      : "Nouvelle ressource disponible";
    const timing =
      availability === "start"
        ? "Elle sera disponible au début du cours."
        : availability === "end"
          ? "Elle sera disponible à la fin du cours."
          : "Elle est disponible dès maintenant.";
    const body = `Une nouvelle ressource a été ajoutée au cours « ${course} » du ${date}.\n\n${timing}`;

    const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    let recent = supabase
      .from("announcements")
      .select("id")
      .eq("author_id", actorId)
      .eq("target_type", "resource")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(1);
    recent = "session_id" in targetScope
      ? recent.eq("session_id", targetScope.session_id)
      : recent.eq("ministry_id", targetScope.ministry_id);
    const { data: previous } = await recent.maybeSingle();
    if (previous) {
      const { error: updateError } = await supabase
        .from("announcements")
        .update({
          title: "De nouvelles ressources sont disponibles",
          body: `De nouvelles ressources ont été ajoutées au cours « ${course} » du ${date}.`,
          target_url: targetUrl,
          target_type: "resource",
          target_id: targetId || null,
          cta_label: "Voir les ressources",
        })
        .eq("id", previous.id);
      if (!updateError) return;
    }

    const { error } = await supabase.from("announcements").insert({
      title,
      body,
      author_id: actorId,
      is_system: true,
      ...targetScope,
      target_url: targetUrl,
      target_type: "resource",
      target_id: targetId || null,
      cta_label: "Voir les ressources",
    });
    if (error) console.error("Notification de cours non envoyée :", error.message);
  } catch (error) {
    console.error("Notification de cours non envoyée :", error);
  }
}
