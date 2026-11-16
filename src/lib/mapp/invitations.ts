import "server-only";

import { randomBytes } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { sha256 } from "./guest";

export function newInvitationToken() { return randomBytes(32).toString("base64url"); }
export function invitationHash(token: string) { return sha256(token); }
export function invitationUrl(token: string, origin?: string) {
  const base = origin ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ministryschool.fr";
  return `${base.replace(/\/$/, "")}/mapp/invitation/${encodeURIComponent(token)}`;
}
export async function invitationSummary(token: string) {
  const service = createServiceClient();
  const tokenHash = invitationHash(token);
  const { data, error } = await service.schema("mapp").rpc("invitation_public_summary", { p_token_hash: tokenHash });
  if (error || !data) return null;
  const { data: invitation } = await service
    .schema("mapp")
    .from("invitations")
    .select("attempt_id")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  let attemptStatus: "in_progress" | "completed" | null = null;
  if (invitation?.attempt_id) {
    const { data: attempt } = await service
      .schema("mapp")
      .from("attempts")
      .select("status")
      .eq("id", invitation.attempt_id)
      .maybeSingle();
    if (attempt?.status === "in_progress" || attempt?.status === "completed") attemptStatus = attempt.status;
  }
  return {
    ...(data as { id: string; inviterFirstName: string; kind: "student" | "admin"; available: boolean }),
    attemptId: (invitation?.attempt_id as string | null) ?? null,
    attemptStatus,
  };
}
