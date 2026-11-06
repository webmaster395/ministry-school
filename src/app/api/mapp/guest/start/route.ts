import { createServiceClient } from "@/lib/supabase/service";
import { newGuestSecrets, setGuestCredential, sha256 } from "@/lib/mapp/guest";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { firstName?: string; lastName?: string; email?: string };
  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  if (firstName.length < 2 || firstName.length > 80 || lastName.length < 2 || lastName.length > 80) return Response.json({ error: "Prénom ou nom invalide." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return Response.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  const { secret, recoveryCode } = newGuestSecrets();
  const { data, error } = await createServiceClient().schema("mapp").rpc("start_guest_hybrid_44_profile", {
    p_first_name: firstName,
    p_last_name: lastName,
    p_email: email,
    p_token_hash: sha256(secret),
    p_recovery_hash: sha256(recoveryCode),
  });
  if (error || !data?.attemptId) return Response.json({ error: "Le questionnaire ne peut pas être démarré." }, { status: 503 });
  await setGuestCredential({ attemptId: data.attemptId, secret, recoveryCode });
  return Response.json({ attemptId: data.attemptId });
}

