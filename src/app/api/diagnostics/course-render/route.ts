import { NextResponse } from "next/server";
import { getViewer } from "@/lib/data/viewer";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const route = typeof body.route === "string" && body.route.startsWith("/etudiant/") ? body.route.slice(0, 500) : "/etudiant/unknown";
  const digest = typeof body.digest === "string" ? body.digest.slice(0, 200) : "missing";
  const viewport = typeof body.viewport === "string" ? body.viewport.slice(0, 50) : null;
  const displayMode = typeof body.displayMode === "string" ? body.displayMode.slice(0, 30) : null;

  await createServiceClient().from("server_render_diagnostics").insert({
    correlation_id: crypto.randomUUID(),
    route,
    stage: "next-error-boundary",
    error_name: "NextServerRenderError",
    error_message: `digest:${digest}`,
    error_stack: null,
    client_context: {
      viewport,
      displayMode,
      online: body.online === true,
      serviceWorkerControlled: body.serviceWorkerControlled === true,
    },
    deployment_sha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 64) ?? null,
  });

  return NextResponse.json({ ok: true });
}
