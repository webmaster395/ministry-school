import { createServiceClient } from "@/lib/supabase/service";
import { isMappGuestOpen, newGuestSecrets, setGuestCredential, sha256 } from "@/lib/mapp/guest";

export async function POST(request: Request) {
  if (!isMappGuestOpen()) return Response.json({ error: "Profil MAPP ouvrira le 7 novembre à 07h00." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { email?: string };
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return Response.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  const { secret, recoveryCode } = newGuestSecrets();
  const { data, error } = await createServiceClient().schema("mapp").rpc("start_guest_hybrid_44", {
    p_email: email,
    p_token_hash: sha256(secret),
    p_recovery_hash: sha256(recoveryCode),
  });
  if (error || !data?.attemptId) return Response.json({ error: "Le questionnaire ne peut pas être démarré." }, { status: 503 });
  await setGuestCredential({ attemptId: data.attemptId, secret, recoveryCode });
  return Response.json({ attemptId: data.attemptId });
}

