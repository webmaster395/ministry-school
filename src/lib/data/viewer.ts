import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Les rôles se cumulent : tout le monde a la vue étudiant, et chaque rôle
 * ajoute un ou plusieurs onglets.
 */
export type ViewerRoles = {
  teacher: boolean;
  admin: boolean;
  serviceLead: boolean;
  projectLead: boolean;
  /** Ministères pilotés (en propre ou par délégation), par identifiant */
  steeringMinistryIds: string[];
};

export type Viewer = {
  id: string;
  fullName: string;
  role: "student" | "teacher" | "admin";
  ministrySlug: string | null;
  ministryName: string | null;
  roles: ViewerRoles;
  deactivated: boolean;
};

/**
 * L'utilisateur connecté, son ministère et ses rôles. Mise en cache le temps d'une requête :
 * la barre latérale et l'en-tête l'utilisent toutes deux sans doubler l'appel.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Rattache d'éventuels accès saisis par e-mail avant cette première connexion
  await supabase.rpc("claim_delegations");

  const [{ data }, { data: steering }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, role, is_teacher, deactivated, is_service_lead, is_project_lead, ministries!profiles_ministry_id_fkey(slug, name)")
      .eq("id", user.id)
      .single(),
    supabase.rpc("steering_ministries"),
  ]);

  const ministry = data?.ministries as unknown as { slug: string; name: string } | null;
  const role = (data?.role as Viewer["role"] | undefined) ?? "student";

  return {
    id: user.id,
    fullName: (data?.full_name as string | undefined) ?? "",
    role,
    ministrySlug: ministry?.slug ?? null,
    ministryName: ministry?.name ?? null,
    deactivated: !!data?.deactivated,
    roles: {
      teacher: role === "teacher" || !!data?.is_teacher,
      admin: role === "admin",
      serviceLead: !!data?.is_service_lead,
      projectLead: !!data?.is_project_lead,
      steeringMinistryIds: (steering ?? []) as string[],
    },
  };
});
