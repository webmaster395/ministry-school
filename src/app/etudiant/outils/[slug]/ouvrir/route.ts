import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL(`/login?next=/etudiant/outils/${slug}/ouvrir`, request.url));
  const { data: app } = await supabase.from("app_catalog").select("id,destination_url,featured_generation").eq("slug", slug).single();
  if (!app) return NextResponse.redirect(new URL("/etudiant", request.url));
  const { data: allowed } = await supabase.rpc("can_access_catalog_app", { p_app: app.id, p_user: user.id });
  if (!allowed) return new NextResponse("Accès refusé", { status: 403 });
  await supabase.from("featured_content_views").upsert({ content_type: "tool", content_id: app.id, user_id: user.id, generation: app.featured_generation || 1 }, { onConflict: "content_type,content_id,user_id,generation", ignoreDuplicates: true });
  return NextResponse.redirect(new URL(app.destination_url, request.url));
}
