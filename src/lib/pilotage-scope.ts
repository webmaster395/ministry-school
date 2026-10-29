import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getViewer } from "@/lib/data/viewer";

/**
 * Une action appelée depuis /gestion/pilotage conserve la casquette Pilotage : le rôle
 * Administrateur ne l'élargit pas. Les mêmes actions restent utilisables depuis la vue
 * Administration, où les droits administrateur sont volontairement complets.
 */
export async function assertPilotageRequestScope(supabase: SupabaseClient, sessionId: string) {
  const referer = (await headers()).get("referer") ?? "";
  let pathname = "";
  try {
    pathname = new URL(referer).pathname;
  } catch {
    pathname = referer;
  }
  if (!pathname.startsWith("/gestion/pilotage")) return false;

  const viewer = await getViewer();
  const { data: session } = await supabase
    .from("sessions")
    .select("session_type, ministry_id")
    .eq("id", sessionId)
    .single();
  if (
    !viewer ||
    session?.session_type !== "ministere" ||
    !session.ministry_id ||
    !viewer.roles.steeringMinistryIds.includes(session.ministry_id)
  ) {
    throw new Error("Ce cours n'appartient pas à votre sensibilité ministérielle.");
  }
  return true;
}
