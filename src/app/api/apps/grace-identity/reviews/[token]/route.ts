import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

const digest = (token: string) => createHash("sha256").update(token).digest("hex");
async function review(token: string) {
  const supabase = createServiceClient();
  const { data } = await supabase.from("grace_identity_skill_reviews").select("id,selected_skills,expires_at,submitted_at,revoked_at").eq("token_hash", digest(token)).maybeSingle();
  if (!data || data.revoked_at || new Date(data.expires_at).getTime() < Date.now()) return null;
  return data;
}
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const item = await review((await params).token);
  return item ? NextResponse.json({ skills: item.selected_skills, submitted: !!item.submitted_at }) : NextResponse.json({ error: "Lien indisponible." }, { status: 404 });
}
export async function PUT(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token; const item = await review(token);
  if (!item || item.submitted_at) return NextResponse.json({ error: "Lien indisponible." }, { status: 404 });
  const body = await request.json().catch(() => null) as { ratings?: unknown; examples?: unknown; additionalSkill?: unknown } | null;
  if (!body || typeof body.ratings !== "object" || !body.ratings || Array.isArray(body.ratings)) return NextResponse.json({ error: "Réponses invalides." }, { status: 400 });
  const allowed = new Set(Array.isArray(item.selected_skills) ? item.selected_skills.filter((value): value is string => typeof value === "string") : []);
  const ratings = Object.fromEntries(Object.entries(body.ratings as Record<string, unknown>).filter(([skill, value]) => allowed.has(skill) && ["natural", "very_good", "not_at_all", "unknown"].includes(String(value))));
  const supabase = createServiceClient();
  const { error } = await supabase.from("grace_identity_skill_reviews").update({ response: { ratings, examples: typeof body.examples === "object" && body.examples ? body.examples : {}, additionalSkill: typeof body.additionalSkill === "string" ? body.additionalSkill.trim().slice(0, 120) : "" }, submitted_at: new Date().toISOString() }).eq("id", item.id).is("submitted_at", null);
  return error ? NextResponse.json({ error: "Enregistrement impossible." }, { status: 500 }) : NextResponse.json({ ok: true });
}
