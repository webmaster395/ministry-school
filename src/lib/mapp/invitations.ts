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
  const { data, error } = await createServiceClient().schema("mapp").rpc("invitation_public_summary", { p_token_hash: invitationHash(token) });
  if (error || !data) return null;
  return data as { id: string; inviterFirstName: string; kind: "student" | "admin"; available: boolean };
}
