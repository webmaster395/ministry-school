import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; resourceId: string }> }) {
  const { id, resourceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", _request.url));
  const { data: resource } = await supabase.from("opportunity_resources").select("external_url,file_path").eq("id", resourceId).eq("opportunity_id", id).maybeSingle();
  if (!resource) return new NextResponse("Ressource introuvable", { status: 404 });
  if (resource.external_url) {
    try {
      const url = new URL(resource.external_url);
      if (url.protocol === "https:" || url.protocol === "http:") return NextResponse.redirect(url);
    } catch { /* URL invalide stockée : on refuse la redirection. */ }
  }
  if (!resource.file_path) return new NextResponse("Ressource introuvable", { status: 404 });
  const { data, error } = await supabase.storage.from("opportunity-resources").createSignedUrl(resource.file_path, 60);
  if (error || !data?.signedUrl) return new NextResponse("Accès refusé", { status: 403 });
  return NextResponse.redirect(data.signedUrl);
}
