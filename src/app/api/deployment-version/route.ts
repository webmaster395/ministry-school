export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA ?? "local";
  const deployment = process.env.VERCEL_DEPLOYMENT_ID ?? null;

  return Response.json(
    { commit, deployment },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Ministry-School-Commit": commit,
      },
    },
  );
}
