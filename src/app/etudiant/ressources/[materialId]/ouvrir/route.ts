import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/data/viewer";
import { getStudentAllSessions } from "@/lib/data/student";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request, { params }: { params: Promise<{ materialId: string }> }) {
  const { materialId } = await params;
  const supabase = await createClient();
  const viewer = await getViewer();
  if (!viewer) return NextResponse.redirect(new URL("/login", request.url));
  const { data: material } = await supabase
    .from("materials")
    .select("id, file_url, link_url, session_id")
    .eq("id", materialId)
    .lte("visible_at", new Date().toISOString())
    .maybeSingle();

  if (!material) return NextResponse.redirect(new URL("/etudiant/cours", request.url));
  const destination = material.file_url ?? material.link_url;
  if (!destination) return NextResponse.redirect(new URL("/etudiant/cours", request.url));
  const [{ data: canManage }, sessions] = await Promise.all([
    supabase.rpc("can_manage_formation_session", { p_session: material.session_id }),
    getStudentAllSessions(supabase, viewer.id),
  ]);
  const privatePath = destination.startsWith("private://") ? destination.slice("private://".length) : null;
  if (!privatePath && !viewer.roles.superAdmin && !canManage && !sessions.some((session) => session.id === material.session_id)) {
    return NextResponse.redirect(new URL("/etudiant/cours", request.url));
  }

  await supabase.rpc("record_material_download", { p_material_id: materialId });
  if (privatePath) {
    const service = createServiceClient();
    const { data, error } = await service.storage.from("formation-private-resources").createSignedUrl(privatePath, 60);
    if (error || !data?.signedUrl) return new NextResponse("Accès refusé", { status: 403 });
    return NextResponse.redirect(data.signedUrl);
  }
  const target = new URL(destination, request.url);
  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return NextResponse.redirect(new URL("/etudiant/cours", request.url));
  }
  return NextResponse.redirect(target);
}
