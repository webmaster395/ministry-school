import { NextResponse } from "next/server";
import { getViewer } from "@/lib/data/viewer";
import { manageGeneropolySession } from "@/lib/apps/generopoly";

export async function PATCH(request: Request) {
  const viewer = await getViewer();
  if (!viewer?.roles.superAdmin || viewer.deactivated) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  try {
    const body = await request.json() as { id?: string; action?: "exclude" | "include" | "delete"; confirmation?: string };
    const action = body.action;
    if (action !== "exclude" && action !== "include" && action !== "delete") return NextResponse.json({ error: "Action invalide." }, { status: 400 });
    return NextResponse.json(await manageGeneropolySession(String(body.id ?? ""), action, body.confirmation), { headers: { "cache-control": "no-store" } });
  } catch (cause) {
    console.error("generopoly_session_manage_failed", { message: cause instanceof Error ? cause.message : "unknown_error" });
    return NextResponse.json({ error: "Impossible de modifier cette journée pour le moment." }, { status: 502 });
  }
}
