import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { clearGuestCredential, getGuestCredential, sha256 } from "@/lib/mapp/guest";

type GuestAccessRow = { attempt_id: string; participant_id: string };
type CompletedAttemptRow = { id: string; participant_id: string; completed_at: string | null };

async function claimCompletedAttemptsByVerifiedEmail() {
  const db = await createClient();
  const { data: userData, error: userError } = await db.auth.getUser();
  const user = userData.user;
  const verifiedEmail = user?.email_confirmed_at && user.email ? user.email.trim().toLowerCase() : null;
  if (userError || !user || !verifiedEmail) return { count: 0, denied: true };

  const service = createServiceClient().schema("mapp");
  const { data: accessRows, error: accessError } = await service
    .from("guest_attempt_access")
    .select("attempt_id,participant_id")
    .eq("email", verifiedEmail)
    .is("claimed_at", null);
  if (accessError) throw accessError;
  const accesses = (accessRows ?? []) as GuestAccessRow[];
  if (!accesses.length) return { count: 0, denied: false };

  const { data: attemptRows, error: attemptError } = await service
    .from("attempts")
    .select("id,participant_id,completed_at")
    .in("id", accesses.map((row) => row.attempt_id))
    .eq("status", "completed")
    .order("completed_at", { ascending: false });
  if (attemptError) throw attemptError;
  const completed = (attemptRows ?? []) as CompletedAttemptRow[];
  if (!completed.length) return { count: 0, denied: false };

  const participantIds = [...new Set(completed.map((row) => row.participant_id))];
  const { data: conflictingLinks, error: conflictError } = await service
    .from("participant_auth_identities")
    .select("participant_id")
    .in("participant_id", participantIds)
    .neq("auth_user_id", user.id)
    .is("revoked_at", null);
  if (conflictError) throw conflictError;
  const forbiddenParticipants = new Set((conflictingLinks ?? []).map((row) => String(row.participant_id)));
  const claimable = completed.filter((row) => !forbiddenParticipants.has(row.participant_id));
  if (!claimable.length) return { count: 0, denied: false };

  const { data: identityRows, error: identityError } = await service
    .from("participant_auth_identities")
    .select("participant_id")
    .eq("auth_user_id", user.id)
    .is("revoked_at", null)
    .limit(1);
  if (identityError) throw identityError;
  let targetParticipant = identityRows?.[0]?.participant_id as string | undefined;
  if (!targetParticipant) {
    targetParticipant = claimable[0].participant_id;
    const { error: linkError } = await service.from("participant_auth_identities").insert({
      participant_id: targetParticipant,
      auth_user_id: user.id,
      kind: "email",
    });
    if (linkError) throw linkError;
  }

  const attemptIds = claimable.map((row) => row.id);
  const { error: moveError } = await service
    .from("attempts")
    .update({ participant_id: targetParticipant, updated_at: new Date().toISOString() })
    .in("id", attemptIds);
  if (moveError) throw moveError;
  const { error: claimError } = await service
    .from("guest_attempt_access")
    .update({ claimed_by: user.id, claimed_at: new Date().toISOString() })
    .in("attempt_id", attemptIds);
  if (claimError) throw claimError;
  return { count: attemptIds.length, denied: false };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { attemptId?: string; recoveryCode?: string };
  const credential = await getGuestCredential(body.attemptId);
  const attemptId = body.attemptId ?? credential?.attemptId;
  const recoveryCode = body.recoveryCode ?? credential?.recoveryCode;
  const db = await createClient();
  const { data: claims } = await db.auth.getClaims();
  if (!claims?.claims?.sub) return Response.json({ error: "Connexion Ministry requise." }, { status: 401 });

  if (attemptId && (credential || recoveryCode)) {
    const { data, error } = credential
      ? await db.rpc("mapp_claim_owned_guest_attempt", {
        p_attempt_id: attemptId,
        p_token_hash: sha256(credential.secret),
      })
      : await db.rpc("mapp_claim_guest_attempt", {
        p_attempt_id: attemptId,
        p_recovery_code: recoveryCode!,
      });
    if (!error && data === true) {
      await clearGuestCredential();
      return Response.json({ claimed: true, attemptId, method: "browser-secret" });
    }
  }

  // Sur un autre appareil, seule l'adresse déjà vérifiée par Ministry est
  // acceptée. Une adresse simplement saisie dans le formulaire ne suffit pas.
  try {
    const result = await claimCompletedAttemptsByVerifiedEmail();
    if (result.denied) return Response.json({ error: "Adresse Ministry vérifiée requise." }, { status: 403 });
    return Response.json({ claimed: result.count > 0, claimedCount: result.count, method: "verified-email" });
  } catch {
    return Response.json({ error: "Rattachement refusé." }, { status: 503 });
  }
}
