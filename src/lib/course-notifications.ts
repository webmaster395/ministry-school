import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type CourseNotificationTarget = "course" | "resource" | "assignment";

type NotificationScope =
  | { session_id: string; ministry_id?: never }
  | { ministry_id: string; session_id?: never };

type NotifyCourseContentOptions = {
  supabase: SupabaseClient;
  actorId: string;
  sessionId: string;
  targetType: CourseNotificationTarget;
  targetId?: string | null;
  contentTitle?: string | null;
  assignmentPhase?: "before" | "after";
  scope?: NotificationScope;
  availability?: "now" | "start" | "end";
};

const CONTENT_TARGETS = {
  course: { anchor: "course-content", label: "Voir le cours" },
  resource: { anchor: "course-resources", label: "Voir les ressources" },
  assignment: { anchor: "after-course", label: "Voir le travail" },
} as const;

/**
 * Crée une communication système actionnable sans masquer l'acteur réel en base.
 * Les ressources ajoutées par une même personne au même cours dans un intervalle court
 * sont regroupées afin de ne pas saturer la messagerie des étudiants.
 */
export async function notifyCourseContent({
  supabase,
  actorId,
  sessionId,
  targetType,
  targetId,
  contentTitle,
  assignmentPhase = "after",
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
    const anchor =
      targetType === "assignment"
        ? assignmentPhase === "before"
          ? "before-course"
          : "after-course"
        : CONTENT_TARGETS[targetType].anchor;
    const targetUrl = `/etudiant/seances/${sessionId}#${anchor}`;
    const targetScope: NotificationScope = scope ?? { session_id: sessionId };

    let title: string;
    let body: string;
    if (targetType === "resource") {
      title = contentTitle
        ? `Nouvelle ressource : ${contentTitle}`
        : "Nouvelle ressource disponible";
      const timing =
        availability === "start"
          ? "Elle sera disponible au début du cours."
          : availability === "end"
            ? "Elle sera disponible à la fin du cours."
            : "Elle est disponible dès maintenant.";
      body = `Une nouvelle ressource a été ajoutée au cours « ${course} » du ${date}.\n\n${timing}`;

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
            target_type: targetType,
            target_id: targetId || null,
            cta_label: "Voir les ressources",
          })
          .eq("id", previous.id);
        if (!updateError) return;
      }
    } else if (targetType === "assignment") {
      title = contentTitle
        ? `Nouveau travail : ${contentTitle}`
        : "Nouveau travail à faire";
      body = `Un nouveau travail est disponible pour le cours « ${course} » du ${date}.`;
    } else {
      title = "Cours mis à jour";
      body = `Le cours « ${course} » du ${date} a été mis à jour.`;
    }

    const { error } = await supabase.from("announcements").insert({
      title,
      body,
      author_id: actorId,
      is_system: true,
      ...targetScope,
      target_url: targetUrl,
      target_type: targetType,
      target_id: targetId || null,
      cta_label: CONTENT_TARGETS[targetType].label,
    });
    if (error) console.error("Notification de cours non envoyée :", error.message);
  } catch (error) {
    console.error("Notification de cours non envoyée :", error);
  }
}
