import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationDigestSettings = {
  enabled: boolean;
  frequency: "daily" | "weekly";
  weekday: number;
  sendTime: string;
  timezone: "Europe/Paris";
  activatedAt: string;
  updatedAt: string;
  nextRunAt: string | null;
  lastProcessedAt: string | null;
  lastStatus: "ready" | "running" | "success" | "partial" | "failed";
  lastSentCount: number;
  lastError: string | null;
};

/** Configuration privée lue via une RPC qui vérifie elle-même le rôle Super admin. */
export async function getNotificationDigestSettings(
  supabase: SupabaseClient,
): Promise<NotificationDigestSettings> {
  const { data, error } = await supabase.rpc("notification_digest_admin_state");
  if (error || !data || typeof data !== "object") {
    throw new Error("Les paramètres de notifications ne sont pas disponibles.");
  }

  const value = data as Record<string, unknown>;
  return {
    enabled: value.enabled === true,
    frequency: value.frequency === "daily" ? "daily" : "weekly",
    weekday: Number(value.weekday ?? 0),
    sendTime: typeof value.sendTime === "string" ? value.sendTime : "10:00",
    timezone: "Europe/Paris",
    activatedAt: String(value.activatedAt ?? ""),
    updatedAt: String(value.updatedAt ?? ""),
    nextRunAt: typeof value.nextRunAt === "string" ? value.nextRunAt : null,
    lastProcessedAt:
      typeof value.lastProcessedAt === "string" ? value.lastProcessedAt : null,
    lastStatus: ["ready", "running", "success", "partial", "failed"].includes(
      String(value.lastStatus),
    )
      ? (value.lastStatus as NotificationDigestSettings["lastStatus"])
      : "ready",
    lastSentCount: Number(value.lastSentCount ?? 0),
    lastError: typeof value.lastError === "string" ? value.lastError : null,
  };
}
