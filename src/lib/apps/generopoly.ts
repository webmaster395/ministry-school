import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

export type GeneropolyValues = Record<string, number | "">;
export type GeneropolySession = {
  id: string;
  code: string;
  session_date?: string;
  title: string;
  status: "open" | "closed";
  is_test?: boolean;
  isExcluded?: boolean;
  created_at: number;
  groupCount: number;
  participantCount: number;
  lastValidationAt?: number | null;
};
export type GeneropolyTable = {
  id: string;
  name: string;
  participantCount: number | null;
  step: number;
  completed: boolean;
  completedAt?: number | null;
  financeCard: string | null;
  timeCard: string | null;
  state: Record<string, unknown>;
  projected: string[];
  createdAt: number;
  updatedAt: number;
};
export type GeneropolySnapshot = {
  session: GeneropolySession | null;
  tables: GeneropolyTable[];
  syncedAt: number;
};
export type GeneropolyContentPage = { id: string; label: string; title: string; subtitle: string; instruction: string; scenario: string; amount?: number; unit?: "€" | "h"; minimumCharacters?: number; questions?: string[] };
export type GeneropolyContentCategory = { key: string; name: string; description: string; emoji: string };
export type GeneropolyContent = { pages: GeneropolyContentPage[]; financeCategories: GeneropolyContentCategory[]; timeCategories: GeneropolyContentCategory[] };
export type GeneropolyContentVersion = { id: string; version: number; status: "draft" | "published" | "archived"; content: GeneropolyContent; createdAt: number; publishedAt: number | null };
export type GeneropolyContentPayload = { draft: GeneropolyContentVersion; published: GeneropolyContentVersion; history: GeneropolyContentVersion[] };

type IntegrationRow = { endpoint_url: string; admin_token: string | null };

export class GeneropolyIntegrationError extends Error {
  constructor(
    public readonly status: number,
    public readonly endpoint: string,
    public readonly path: string,
  ) {
    super(`Généropoly a répondu avec le statut ${status}.`);
    this.name = "GeneropolyIntegrationError";
  }
}

async function integration(): Promise<{ endpoint_url: string; admin_token: string }> {
  const service = createServiceClient();
  const { data, error } = await service.from("app_integrations").select("endpoint_url,admin_token").eq("app_slug", "generopoly").maybeSingle();
  if (error) throw new Error(`Configuration Généropoly inaccessible : ${error.message}`);
  const row = data as IntegrationRow | null;
  if (!row?.endpoint_url || !row.admin_token) throw new Error("L’intégration Généropoly n’est pas encore configurée.");
  return { endpoint_url: row.endpoint_url, admin_token: row.admin_token };
}

async function generopolyFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const config = await integration();
  const endpoint = config.endpoint_url.replace(/\/$/, "");
  const candidates = endpoint.endsWith("/apps/generopoly") ? [endpoint] : [endpoint, `${endpoint}/apps/generopoly`];
  let lastStatus = 502;
  for (const base of candidates) {
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: { "content-type": "application/json", "x-admin-token": config.admin_token, ...init.headers },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (response.ok) return response.json() as Promise<T>;
    lastStatus = response.status;
    if (response.status !== 404) break;
  }
  throw new GeneropolyIntegrationError(lastStatus, endpoint, path);
}

export async function getGeneropolyContent(): Promise<GeneropolyContentPayload> {
  return generopolyFetch<GeneropolyContentPayload>("/api/admin/content");
}

export async function saveGeneropolyDraft(content: GeneropolyContent): Promise<{ ok: boolean; id: string }> {
  return generopolyFetch("/api/admin/content", { method: "PUT", body: JSON.stringify({ content }) });
}

export async function publishGeneropolyDraft(): Promise<{ ok: boolean; id: string }> {
  return generopolyFetch("/api/admin/content", { method: "POST", body: JSON.stringify({ action: "publish" }) });
}

export async function restoreGeneropolyVersion(id: string): Promise<{ ok: boolean; id: string }> {
  return generopolyFetch("/api/admin/content", { method: "POST", body: JSON.stringify({ action: "restore", id }) });
}

export async function getGeneropolySessions(): Promise<GeneropolySession[]> {
  const data = await generopolyFetch<{ sessions: Array<Omit<GeneropolySession, "groupCount" | "participantCount" | "lastValidationAt" | "isExcluded"> & { group_count?: number; participant_count?: number; last_validation_at?: number | null; is_excluded?: boolean }> }>("/api/admin/sessions");
  return data.sessions.filter((session) => !session.is_test).map((session) => ({
    ...session,
    groupCount: Number(session.group_count ?? 0),
    participantCount: Number(session.participant_count ?? 0),
    lastValidationAt: session.last_validation_at ?? null,
    isExcluded: session.is_excluded === true,
  })).filter((session) => session.groupCount > 0).sort((left, right) => String(right.session_date ?? "").localeCompare(String(left.session_date ?? "")));
}

export async function getGeneropolySnapshot(sessionId: string): Promise<GeneropolySnapshot> {
  if (sessionId === "all") {
    const sessions = await getGeneropolySessions();
    const snapshots = await Promise.all(sessions.filter((session) => !session.isExcluded).map((session) => getGeneropolySnapshot(session.id)));
    const tables = snapshots.flatMap((snapshot) => snapshot.tables);
    return {
      session: {
        id: "all",
        code: "all",
        title: "Toutes les sessions",
        status: "closed",
        created_at: 0,
        groupCount: tables.length,
        participantCount: tables.reduce((sum, table) => sum + Number(table.participantCount ?? 0), 0),
        lastValidationAt: tables.length ? Math.max(...tables.map((table) => Number(table.completedAt ?? table.updatedAt ?? 0))) : null,
      },
      tables,
      syncedAt: Date.now(),
    };
  }
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(sessionId)) throw new Error("Identifiant de journée invalide.");
  return generopolyFetch<GeneropolySnapshot>(`/api/admin/snapshot?id=${encodeURIComponent(sessionId)}`);
}

export async function setGeneropolyProjectedAnswer(tableId: string, key: string, selected: boolean): Promise<{ ok: boolean; projected: string[] }> {
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(tableId) || !/^[a-zA-Z0-9-]{1,100}$/.test(key)) throw new Error("Réponse Généropoly invalide.");
  return generopolyFetch("/api/admin/project", { method: "PATCH", body: JSON.stringify({ tableId, key, selected }) });
}

export async function manageGeneropolySession(id: string, action: "exclude" | "include" | "delete", confirmation?: string): Promise<{ ok: boolean; is_excluded?: boolean; deletedGroups?: number }> {
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(id)) throw new Error("Identifiant de journée invalide.");
  return generopolyFetch("/api/admin/session", { method: "PATCH", body: JSON.stringify({ id, action, confirmation }) });
}

export async function getGeneropolyOverview() {
  const sessions = await getGeneropolySessions();
  const snapshots = await Promise.all(sessions.slice(0, 20).map((session) => getGeneropolySnapshot(session.id)));
  const completed = snapshots.flatMap((snapshot) => snapshot.tables.filter((table) => table.completed));
  return {
    sessions,
    snapshots,
    completedParticipations: completed.length,
    totalParticipants: completed.reduce((sum, table) => sum + Number(table.participantCount ?? 0), 0),
    groupCount: completed.length,
    lastWorkshop: sessions.find((session) => session.session_date)?.session_date ?? null,
  };
}

