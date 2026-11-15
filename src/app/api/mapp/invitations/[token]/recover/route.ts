import { randomBytes } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { invitationHash } from "@/lib/mapp/invitations";
import { setGuestCredential, sha256 } from "@/lib/mapp/guest";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await request.json().catch(() => null) as { email?: string; recoveryCode?: string } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  const recoveryCode = body?.recoveryCode?.trim().toUpperCase() ?? "";
  if (!email || !recoveryCode) {
    return Response.json({ error: "L’adresse e-mail et le code de récupération sont requis." }, { status: 400 });
  }

  const secret = randomBytes(32).toString("base64url");
  const { data, error } = await createServiceClient().schema("mapp").rpc("recover_invited_guest", {
    p_invitation_hash: invitationHash(token),
    p_email: email,
    p_recovery_hash: sha256(recoveryCode),
    p_new_access_hash: sha256(secret),
  });
  if (error || !data?.attemptId) {
    return Response.json({ error: "Ces informations ne permettent pas de retrouver ce test." }, { status: 403 });
  }

  await setGuestCredential({ attemptId: data.attemptId, secret, recoveryCode });
  return Response.json({ attemptId: data.attemptId, status: data.status });
}
