import { connection } from "next/server";

/** Liveness check for the web app itself (UptimeRobot, smoke tests). */
export async function GET(): Promise<Response> {
  // Run on every request; a prerendered copy would say "ok" even if the server were down.
  await connection();
  return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
