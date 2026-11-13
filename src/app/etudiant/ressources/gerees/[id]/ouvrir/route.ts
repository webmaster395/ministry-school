import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL(`/login?next=/etudiant/ressources`, request.url));
  const { data: allowed } = await supabase.rpc("can_access_managed_resource", { p_resource: id, p_user: user.id });
  if (!allowed) return new NextResponse("Accès refusé", { status: 403 });
  const { data: resource } = await supabase.from("managed_resources").select("external_url,file_path,featured_generation").eq("id", id).single();
  if (!resource) return new NextResponse("Ressource introuvable", { status: 404 });
  await supabase.from("featured_content_views").upsert({ content_type: "resource", content_id: id, user_id: user.id, generation: resource.featured_generation || 1 }, { onConflict: "content_type,content_id,user_id,generation", ignoreDuplicates: true });
  if (resource.external_url) return NextResponse.redirect(resource.external_url);
  const { data, error } = await supabase.storage.from("managed-resources").createSignedUrl(resource.file_path, 300);
  if (error || !data?.signedUrl) return new NextResponse("Fichier indisponible", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
