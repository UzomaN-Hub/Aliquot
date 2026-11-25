import { cacheLife } from "next/cache";
import { z } from "zod";

import { serverConfig } from "@/lib/config";

/** Lab address in the URL: same rule as the database's CHECK on labs.slug. */
export const LAB_SLUG = /^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$/;

const brandingSchema = z.object({
  name: z.string(),
  slug: z.string(),
  status: z.enum(["active", "suspended"]),
});

export type LabBranding = z.infer<typeof brandingSchema>;

/**
 * Public branding for a lab, fetched on the server straight from the API
 * (server to server, not through the browser proxy). Cached 5 minutes
 * (FRONTEND.md §4), so a lab's sign-in page shows its name on first paint.
 * Unknown labs are cached too (null); API failures throw and are never cached.
 */
export async function getLabBranding(slug: string): Promise<LabBranding | null> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });

  if (!LAB_SLUG.test(slug)) return null;
  const response = await fetch(`${serverConfig.API_URL}/v1/labs/${slug}/branding`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Lab branding request failed with ${response.status}`);
  return brandingSchema.parse(await response.json());
}
