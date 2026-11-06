import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { MAPP_GUEST_COOKIE, newGuestSecrets, serializeGuestCredential, setGuestCredential, sha256 } from "@/lib/mapp/guest";

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
  // Attache explicitement le jeton à la réponse HTTP. Cela garantit que le
  // navigateur l'a enregistré avant que le client ouvre la page du test.
  const response = NextResponse.json({ attemptId: data.attemptId });
  response.cookies.set(MAPP_GUEST_COOKIE, serializeGuestCredential({ attemptId: data.attemptId, secret, recoveryCode }), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

