import { createClient } from "@/lib/supabase/server";
import { clearGuestCredential, getGuestCredential } from "@/lib/mapp/guest";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { attemptId?: string; recoveryCode?: string };
  const credential = await getGuestCredential(body.attemptId);
  const attemptId = body.attemptId ?? credential?.attemptId;
  const recoveryCode = body.recoveryCode ?? credential?.recoveryCode;
  if (!attemptId || !recoveryCode) return Response.json({ error: "Code de récupération requis." }, { status: 400 });
  const db = await createClient();
  const { data: claims } = await db.auth.getClaims();
  if (!claims?.claims?.sub) return Response.json({ error: "Connexion Ministry requise." }, { status: 401 });
  const { data, error } = await db.rpc("mapp_claim_guest_attempt", {
    p_attempt_id: attemptId,
    p_recovery_code: recoveryCode,
  });
  if (error || data !== true) return Response.json({ error: "Rattachement refusé." }, { status: 403 });
  await clearGuestCredential();
  return Response.json({ claimed: true, attemptId });
}
