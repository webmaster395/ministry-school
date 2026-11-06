import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import type { MappQuestionnaireContext, MappResultBundle } from "./types";
export { MAPP_GUEST_OPENS_AT, isMappGuestOpen } from "./access-window";
import { isMappGuestOpen } from "./access-window";

export const MAPP_GUEST_COOKIE = "ministry_mapp_guest";

type GuestCredential = { attemptId: string; secret: string; recoveryCode: string };

export function serializeGuestCredential(value: GuestCredential) {
  return `${value.attemptId}.${value.secret}.${value.recoveryCode}`;
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function newGuestSecrets() {
  const secret = randomBytes(32).toString("base64url");
  const recoveryCode = randomBytes(9).toString("base64url").toUpperCase().match(/.{1,4}/g)!.join("-");
  return { secret, recoveryCode };
}

export async function setGuestCredential(value: GuestCredential) {
  const jar = await cookies();
  jar.set(MAPP_GUEST_COOKIE, serializeGuestCredential(value), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    // Les routes privées sont réparties entre /apps et /api/mapp.
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearGuestCredential() {
  const jar = await cookies();
  jar.delete(MAPP_GUEST_COOKIE);
}

export async function getGuestCredential(attemptId?: string): Promise<GuestCredential | null> {
  const raw = (await cookies()).get(MAPP_GUEST_COOKIE)?.value;
  if (!raw) return null;
  const [storedAttemptId, secret, recoveryCode] = raw.split(".");
  if (!storedAttemptId || !secret || !recoveryCode || (attemptId && storedAttemptId !== attemptId)) return null;
  return { attemptId: storedAttemptId, secret, recoveryCode };
}

export async function openGuestQuestionnaire(attemptId: string) {
  const credential = await getGuestCredential(attemptId);
  if (!credential) return null;
  const { data, error } = await createServiceClient().schema("mapp").rpc("open_guest_hybrid_44", {
    p_attempt_id: attemptId,
    p_token_hash: sha256(credential.secret),
  });
  if (error) return null;
  return data as MappQuestionnaireContext;
}

export async function getGuestResult(attemptId: string) {
  const credential = await getGuestCredential(attemptId);
  if (!credential) return null;
  const { data, error } = await createServiceClient().schema("mapp").rpc("guest_result_bundle", {
    p_attempt_id: attemptId,
    p_token_hash: sha256(credential.secret),
  });
  if (error) return null;
  return data as MappResultBundle;
}

export async function guestOwnsAttempt(attemptId: string) {
  const credential = await getGuestCredential(attemptId);
  if (!credential) return false;
  const { data } = await createServiceClient().schema("mapp").rpc("guest_access_allowed", {
    p_attempt_id: attemptId,
    p_token_hash: sha256(credential.secret),
  });
  return data === true;
}

