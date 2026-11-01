import { NextResponse } from "next/server";
import { getViewer } from "@/lib/data/viewer";
import { GeneropolyIntegrationError, getGeneropolySnapshot } from "@/lib/apps/generopoly";

export async function GET(request: Request) {
  const viewer = await getViewer();
  if (!viewer?.roles.superAdmin || viewer.deactivated) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const sessionId = new URL(request.url).searchParams.get("session") ?? "";
  try {
    const snapshot = await getGeneropolySnapshot(sessionId);
    return NextResponse.json(snapshot, { headers: { "cache-control": "no-store" } });
  } catch (cause) {
    console.error("generopoly_snapshot_load_failed", {
      sessionId,
      message: cause instanceof Error ? cause.message : "unknown_error",
      status: cause instanceof GeneropolyIntegrationError ? cause.status : undefined,
      endpoint: cause instanceof GeneropolyIntegrationError ? cause.endpoint : undefined,
      path: cause instanceof GeneropolyIntegrationError ? cause.path : undefined,
    });
    return NextResponse.json({ error: "Impossible de charger les résultats pour le moment." }, { status: 502 });
  }
}

