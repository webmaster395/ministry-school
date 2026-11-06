import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { attemptId?: string; recoveryCode?: string };
  if (!body.attemptId || !body.recoveryCode) return Response.json({ error: "Code de récupération requis." }, { status: 400 });
  const db = await createClient();
  const { data: claims } = await db.auth.getClaims();
  if (!claims?.claims?.sub) return Response.json({ error: "Connexion Ministry requise." }, { status: 401 });
  const { data, error } = await db.rpc("mapp_claim_guest_attempt", {
    p_attempt_id: body.attemptId,
    p_recovery_code: body.recoveryCode,
  });
  if (error || data !== true) return Response.json({ error: "Rattachement refusé." }, { status: 403 });
  return Response.json({ claimed: true });
}
