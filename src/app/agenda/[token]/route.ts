import { verifyCalendarToken } from "@/lib/calendar-token";
import { createServiceClient } from "@/lib/supabase/service";
import { getStudentSessions } from "@/lib/data/student";
import { buildIcs } from "@/lib/ics";

/**
 * Adresse d'abonnement publique du calendrier (webcal) : un lien secret et personnel, sans
 * connexion, que l'agenda du téléphone revisite tout seul. Le jeton (voir calendar-token.ts)
 * tient lieu d'identité ; la clé service_role contourne les règles de sécurité pour aller
 * chercher les séances de la bonne personne, exactement comme le ferait une session ouverte.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const userId = verifyCalendarToken(token);
  if (!userId) return new Response("Lien invalide", { status: 404 });

  const supabase = createServiceClient();
  const sessions = await getStudentSessions(supabase, userId);

  return new Response(buildIcs(sessions), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="ministry-school.ics"',
      "Cache-Control": "public, max-age=1800",
    },
  });
}
