import { NextResponse } from "next/server";
import { getViewer } from "@/lib/data/viewer";
import { setGeneropolyProjectedAnswer } from "@/lib/apps/generopoly";

export async function PATCH(request: Request) {
  const viewer = await getViewer();
  if (!viewer?.roles.superAdmin || viewer.deactivated) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  try {
    const body = await request.json() as { tableId?: string; key?: string; selected?: boolean };
    const result = await setGeneropolyProjectedAnswer(String(body.tableId ?? ""), String(body.key ?? ""), body.selected === true);
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (cause) {
    console.error("generopoly_projection_answer_update_failed", { message: cause instanceof Error ? cause.message : "unknown_error" });
    return NextResponse.json({ error: "Impossible de modifier la sélection pour la projection." }, { status: 502 });
  }
}
