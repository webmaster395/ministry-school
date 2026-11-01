import { NextResponse } from "next/server";
import { getViewer } from "@/lib/data/viewer";
import { getGeneropolyContent, publishGeneropolyDraft, restoreGeneropolyVersion, saveGeneropolyDraft, type GeneropolyContent } from "@/lib/apps/generopoly";

async function authorized() {
  const viewer = await getViewer();
  return Boolean(viewer?.roles.superAdmin && !viewer.deactivated);
}

export async function GET() {
  if (!(await authorized())) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  try {
    return NextResponse.json(await getGeneropolyContent(), { headers: { "cache-control": "no-store" } });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "Contenus indisponibles." }, { status: 502 });
  }
}

export async function PUT(request: Request) {
  if (!(await authorized())) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  try {
    const body = await request.json() as { content?: GeneropolyContent };
    if (!body.content) return NextResponse.json({ error: "Contenu manquant." }, { status: 400 });
    return NextResponse.json(await saveGeneropolyDraft(body.content));
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "Sauvegarde impossible." }, { status: 400 });
  }
}

export async function POST(request: Request) {
  if (!(await authorized())) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  try {
    const body = await request.json() as { action?: "publish" | "restore"; id?: string };
    if (body.action === "publish") return NextResponse.json(await publishGeneropolyDraft());
    if (body.action === "restore" && body.id) return NextResponse.json(await restoreGeneropolyVersion(body.id));
    return NextResponse.json({ error: "Action invalide." }, { status: 400 });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "Action impossible." }, { status: 400 });
  }
}
