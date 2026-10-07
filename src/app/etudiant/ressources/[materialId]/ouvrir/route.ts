import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ materialId: string }> }) {
  const { materialId } = await params;
  const supabase = await createClient();
  const { data: material } = await supabase
    .from("materials")
    .select("id, file_url, link_url")
    .eq("id", materialId)
    .maybeSingle();

  const destination = material?.file_url ?? material?.link_url;
  if (!destination) return NextResponse.redirect(new URL("/etudiant/cours", request.url));

  await supabase.rpc("record_material_download", { p_material_id: materialId });
  const target = new URL(destination, request.url);
  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return NextResponse.redirect(new URL("/etudiant/cours", request.url));
  }
  return NextResponse.redirect(target);
}
