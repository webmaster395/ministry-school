import { createClient } from "@/lib/supabase/server";
import { getStudentSessions } from "@/lib/data/student";
import { buildIcs } from "@/lib/ics";

// Téléchargement ponctuel du calendrier, pour la personne déjà connectée.
// Pour un abonnement qui se met à jour tout seul, voir /agenda/[token].
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Non autorisé", { status: 401 });

  const sessions = await getStudentSessions(supabase, user.id);

  return new Response(buildIcs(sessions), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="ministry-school.ics"',
    },
  });
}
