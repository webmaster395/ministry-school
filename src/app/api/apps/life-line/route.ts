import { NextResponse } from "next/server";
import { getViewer } from "@/lib/data/viewer";
import { createClient } from "@/lib/supabase/server";

type EventInput = { id?: unknown; year?: unknown; title?: unknown; story?: unknown; lesson?: unknown; verse?: unknown; complete?: unknown };

function cleanEvents(input: unknown) {
  if (!Array.isArray(input)) return [];
  const currentYear = new Date().getFullYear();
  return input.slice(0, 100).flatMap((raw) => {
    const item = raw as EventInput;
    const year = Number(item.year);
    if (!Number.isInteger(year) || year < 1 || year > currentYear) return [];
    const title = typeof item.title === "string" ? item.title.trim().slice(0, 160) : "";
    const story = typeof item.story === "string" ? item.story.trim().slice(0, 8000) : "";
    const lesson = typeof item.lesson === "string" ? item.lesson.trim().slice(0, 8000) : "";
    const verse = typeof item.verse === "string" ? item.verse.trim().slice(0, 1000) : "";
    return [{ id: typeof item.id === "string" ? item.id.slice(0, 100) : crypto.randomUUID(), year, title, story, lesson, verse, complete: Boolean(title && story && lesson) }];
  });
}

function cleanReflection(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return Object.fromEntries(Object.entries(input as Record<string, unknown>).slice(0, 4).map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 8000) : ""]));
}

export async function GET() {
  const viewer = await getViewer();
  if (!viewer || viewer.deactivated) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  const supabase = await createClient();
  const { data, error } = await supabase.from("life_line_journeys").select("events,reflection,completed_at,updated_at").eq("user_id", viewer.id).maybeSingle();
  if (error) return NextResponse.json({ error: "Chargement impossible." }, { status: 500 });
  return NextResponse.json({ journey: data });
}

export async function PUT(request: Request) {
  const viewer = await getViewer();
  if (!viewer || viewer.deactivated) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  const body = await request.json().catch(() => null) as { events?: unknown; reflection?: unknown; completed?: unknown } | null;
  if (!body) return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  const events = cleanEvents(body.events);
  const reflection = cleanReflection(body.reflection);
  // L'exercice n'impose aucun nombre minimal d'événements. Une réflexion peut
  // donc être finalisée même si la personne choisit de garder son récit vide.
  const completedAt = body.completed ? new Date().toISOString() : null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("life_line_journeys").upsert({ user_id: viewer.id, events, reflection, completed_at: completedAt }, { onConflict: "user_id" }).select("events,reflection,completed_at,updated_at").single();
  if (error) return NextResponse.json({ error: "Enregistrement impossible." }, { status: 500 });
  return NextResponse.json({ journey: data });
}
