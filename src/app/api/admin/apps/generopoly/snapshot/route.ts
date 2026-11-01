import { NextResponse } from "next/server";
import { getViewer } from "@/lib/data/viewer";
import { getGeneropolySnapshot } from "@/lib/apps/generopoly";

export async function GET(request: Request) {
  const viewer = await getViewer();
  if (!viewer?.roles.superAdmin || viewer.deactivated) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  const sessionId = new URL(request.url).searchParams.get("session") ?? "";
  try {
    const snapshot = await getGeneropolySnapshot(sessionId);
    return NextResponse.json(snapshot, { headers: { "cache-control": "no-store" } });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "Synchronisation impossible." }, { status: 502 });
  }
}

