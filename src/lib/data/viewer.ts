import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

import type { ViewerRoles } from "@/lib/roles";
import { signedAvatarUrls } from "@/lib/avatars";
import { isDemoAdminEmail } from "@/lib/demo-admin";
import { parseMlkEngagement, type MlkEngagement } from "@/lib/mlk-engagement";

export type { ViewerRoles };
export { isPlainStudent } from "@/lib/roles";

export type Viewer = {
  id: string;
  fullName: string;
  role: "student" | "teacher" | "admin";
  ministrySlug: string | null;
  ministryName: string | null;
  roles: ViewerRoles;
  deactivated: boolean;
  avatarUrl: string | null;
  /** Messages reçus depuis la dernière fois que la personne a tout marqué comme lu */
  unreadMessages: number;
  /** Le message de bienvenue a déjà été vu (les nouveaux inscrits ne l'ont pas encore vu) */
  welcomeSeen: boolean;
  mlkEngagement: MlkEngagement;
  preferredDay: string | null;
  ministryId: string | null;
  notificationsSeenAt: string;
  profileCreatedAt: string | null;
  courseNotesEnabled: boolean;
};

/**
 * L'utilisateur connecté, son ministère et ses rôles. Mise en cache le temps d'une requête :
 * la barre latérale et l'en-tête l'utilisent toutes deux sans doubler l'appel.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  // Le projet utilise une clé de signature ES256 publiée via JWKS. getClaims()
  // vérifie cryptographiquement le JWT, avec clés mises en cache, sans appel
  // distant à /auth/v1/user pendant le rendu.
  const { data: auth, error: authError } = await supabase.auth.getClaims();
  if (authError || !auth?.claims?.sub) return null;
  const userId = auth.claims.sub;
  const userEmail = typeof auth.claims.email === "string" ? auth.claims.email : undefined;

  const { data: raw, error } = await supabase.rpc("student_viewer_context");
  if (error) throw new Error(`Chargement du contexte utilisateur impossible : ${error.message}`);
  if (!raw) return null;
  const data = raw as unknown as {
    full_name?: string;
    role?: Viewer["role"];
    is_teacher?: boolean;
    deactivated?: boolean;
    avatar_path?: string | null;
    created_at?: string | null;
    preferred_day?: string | null;
    ministry_id?: string | null;
    notifications_seen_at?: string | null;
    notification_prefs?: unknown;
    welcome_seen_at?: string | null;
    is_service_lead?: boolean;
    is_project_lead?: boolean;
    ministry_slug?: string | null;
    ministry_name?: string | null;
    steering_ministry_ids?: string[];
    course_notes_enabled?: boolean;
    unread_messages?: number;
  };

  const demoAdmin = isDemoAdminEmail(userEmail);
  const role = data.role ?? "student";
  const avatarPath = data.avatar_path ?? null;
  const avatarUrl = avatarPath ? ((await signedAvatarUrls(supabase, [avatarPath])).get(avatarPath) ?? null) : null;
  const seenAt = data.notifications_seen_at ?? "1970-01-01T00:00:00Z";
  const createdAt = data.created_at ?? null;

  return {
    id: userId,
    unreadMessages: Number(data.unread_messages ?? 0),
    welcomeSeen: !!data.welcome_seen_at,
    mlkEngagement: parseMlkEngagement(data.notification_prefs),
    preferredDay: data.preferred_day ?? null,
    ministryId: data.ministry_id ?? null,
    notificationsSeenAt: seenAt,
    profileCreatedAt: createdAt,
    courseNotesEnabled: process.env.COURSE_NOTES_ENABLED === "1" || !!data.course_notes_enabled,
    fullName: data.full_name ?? "",
    role,
    ministrySlug: demoAdmin ? null : (data.ministry_slug ?? null),
    ministryName: demoAdmin ? null : (data.ministry_name ?? null),
    deactivated: !!data.deactivated,
    avatarUrl,
    roles: {
      teacher: role === "teacher" || !!data.is_teacher,
      admin: role === "admin",
      serviceLead: !!data.is_service_lead,
      projectLead: !!data.is_project_lead,
      steeringMinistryIds: data.steering_ministry_ids ?? [],
    },
  };
});
