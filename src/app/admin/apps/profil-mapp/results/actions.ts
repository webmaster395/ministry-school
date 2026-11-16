"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/data/viewer";
import { createServiceClient } from "@/lib/supabase/service";

export type ResultActionState = { status: "idle" | "success" | "error"; message: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function requireSuperAdmin() {
  const viewer = await getViewer();
  if (!viewer?.roles.superAdmin || viewer.deactivated) throw new Error("Accès refusé.");
  return viewer;
}

export async function linkMappResult(
  attemptId: string,
  participantId: string,
  _previous: ResultActionState,
  formData: FormData,
): Promise<ResultActionState> {
  await requireSuperAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!uuid.test(attemptId) || !uuid.test(participantId) || !uuid.test(userId)) {
    return { status: "error", message: "Sélectionne un compte Ministry School valide." };
  }
  const service = createServiceClient();
  const [{ data: account }, { data: attempt }] = await Promise.all([
    service.from("profiles").select("id,full_name,deactivated").eq("id", userId).maybeSingle(),
    service.schema("mapp").from("attempts").select("id,participant_id").eq("id", attemptId).maybeSingle(),
  ]);
  if (!account || account.deactivated || !attempt || attempt.participant_id !== participantId) {
    return { status: "error", message: "Le compte ou le résultat n’est plus disponible." };
  }
  const mapp = service.schema("mapp");
  const { data: existingIdentity, error: identityError } = await mapp.from("participant_auth_identities")
    .select("participant_id").eq("auth_user_id", userId).is("revoked_at", null).maybeSingle();
  if (identityError) return { status: "error", message: `Rattachement impossible : ${identityError.message}` };
  if (existingIdentity?.participant_id && existingIdentity.participant_id !== participantId) {
    const { error } = await mapp.from("attempts").update({ participant_id: existingIdentity.participant_id }).eq("id", attemptId).eq("participant_id", participantId);
    if (error) return { status: "error", message: `Rattachement impossible : ${error.message}` };
  } else if (!existingIdentity) {
    const { error } = await mapp.from("participant_auth_identities").insert({ participant_id: participantId, auth_user_id: userId, kind: "email" });
    if (error) return { status: "error", message: `Rattachement impossible : ${error.message}` };
  }
  revalidatePath("/admin/apps/profil-mapp/results");
  revalidatePath(`/admin/apps/profil-mapp/results/${attemptId}`);
  revalidatePath("/etudiant/identite");
  return { status: "success", message: `Résultat rattaché à ${account.full_name || "ce compte"}.` };
}

export async function deleteTestMappResult(
  attemptId: string,
  participantId: string,
  _previous: ResultActionState,
  formData: FormData,
): Promise<ResultActionState> {
  await requireSuperAdmin();
  if (formData.get("confirm") !== "on") return { status: "error", message: "Confirme la suppression du passage test." };
  if (!uuid.test(attemptId) || !uuid.test(participantId)) return { status: "error", message: "Résultat introuvable." };
  const service = createServiceClient();
  const mapp = service.schema("mapp");
  const [{ data: attempt }, { data: profile }, { data: identity }] = await Promise.all([
    mapp.from("attempts").select("id,participant_id").eq("id", attemptId).maybeSingle(),
    mapp.from("participant_profiles").select("first_name,last_name,email").eq("participant_id", participantId).maybeSingle(),
    mapp.from("participant_auth_identities").select("auth_user_id").eq("participant_id", participantId).is("revoked_at", null).maybeSingle(),
  ]);
  if (!attempt || attempt.participant_id !== participantId) return { status: "error", message: "Résultat introuvable." };
  const { data: ministryProfile } = identity?.auth_user_id
    ? await service.from("profiles").select("is_test_account,full_name").eq("id", identity.auth_user_id).maybeSingle()
    : { data: null };
  const testText = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""} ${profile?.email ?? ""} ${ministryProfile?.full_name ?? ""}`;
  const isTest = ministryProfile?.is_test_account === true || /(^|[\s._+-])test([\s._@+-]|$)/i.test(testText);
  if (!isTest) return { status: "error", message: "Suppression refusée : ce passage n’est pas identifié comme compte test." };
  const { error: revisionError } = await mapp.from("result_revisions").delete().eq("attempt_id", attemptId);
  if (revisionError) return { status: "error", message: `Suppression impossible : ${revisionError.message}` };
  const { error } = await mapp.from("attempts").delete().eq("id", attemptId).eq("participant_id", participantId);
  if (error) return { status: "error", message: `Suppression impossible : ${error.message}` };
  revalidatePath("/admin/apps/profil-mapp/results");
  return { status: "success", message: "Le passage test a été supprimé. Le compte utilisateur n’a pas été supprimé." };
}
