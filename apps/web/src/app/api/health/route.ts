import { connection } from "next/server";

/**
 * Liveness check for the web app itself (UptimeRobot, smoke tests). `commit` is the
 * Git commit Vercel built (a public repo, so not a secret), so the staging check can
 * wait for the new version before testing it (decision 022). Null when run locally.
 */
export async function GET(): Promise<Response> {
  // Run on every request; a prerendered copy would say "ok" even if the server were down.
  await connection();
  return Response.json(
    { status: "ok", commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
