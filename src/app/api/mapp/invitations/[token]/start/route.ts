import { createServiceClient } from "@/lib/supabase/service";
import { invitationHash } from "@/lib/mapp/invitations";
import { newGuestSecrets, setGuestCredential, sha256 } from "@/lib/mapp/guest";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await request.json().catch(() => null) as null | {
    gender?: string; firstName?: string; lastName?: string; email?: string;
    belongsToChurch?: boolean; churchName?: string; consent?: boolean;
  };
  if (!body?.consent) return Response.json({ error: "Ton consentement est nécessaire pour enregistrer le test." }, { status: 400 });
  const secrets = newGuestSecrets();
  const { data, error } = await createServiceClient().schema("mapp").rpc("start_invited_guest", {
    p_invitation_hash: invitationHash(token), p_gender: body.gender,
    p_first_name: body.firstName, p_last_name: body.lastName, p_email: body.email,
    p_belongs_to_church: Boolean(body.belongsToChurch), p_church_name: body.churchName ?? null,
    p_consent_version: "mapp-invitation-v1", p_access_hash: sha256(secrets.secret), p_recovery_hash: sha256(secrets.recoveryCode),
  });
  if (error || !data?.attemptId) return Response.json({ error: "Cette invitation est invalide, expirée ou déjà utilisée." }, { status: 400 });
  await setGuestCredential({ attemptId: data.attemptId, secret: secrets.secret, recoveryCode: secrets.recoveryCode });
  return Response.json({ attemptId: data.attemptId, recoveryCode: secrets.recoveryCode });
}
