import "server-only";
import { randomUUID } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";

type DiagnosticContext = {
  correlationId: string;
  route: string;
};

const safeText = (value: unknown, fallback: string) => {
  if (typeof value !== "string" || !value.trim()) return fallback;
  return value.slice(0, 4000);
};

export function createDiagnosticContext(route: string): DiagnosticContext {
  return { correlationId: randomUUID(), route };
}

async function recordFailure(context: DiagnosticContext, stage: string, error: unknown) {
  const value = error instanceof Error ? error : new Error(String(error));
  const payload = {
    correlation_id: context.correlationId,
    route: context.route,
    stage,
    error_name: safeText(value.name, "Error"),
    error_message: safeText(value.message, "Erreur serveur sans message"),
    error_stack: value.stack ? safeText(value.stack, "") : null,
    deployment_sha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 64) ?? null,
  };

  console.error("[course-ssr]", payload);
  try {
    await createServiceClient().from("server_render_diagnostics").insert(payload);
  } catch (diagnosticError) {
    console.error("[course-ssr:diagnostic-write-failed]", {
      correlationId: context.correlationId,
      stage,
      message: diagnosticError instanceof Error ? diagnosticError.message : "unknown",
    });
  }
}

export async function traceServerStage<T>(
  context: DiagnosticContext,
  stage: string,
  operation: () => PromiseLike<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    await recordFailure(context, stage, error);
    throw error;
  }
}

export async function reportServerRenderFailure(
  context: DiagnosticContext,
  stage: string,
  error: unknown,
) {
  await recordFailure(context, stage, error);
}
