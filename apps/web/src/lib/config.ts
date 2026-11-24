import { z } from "zod";

/**
 * Server-side settings, read from environment variables and validated once.
 * A missing or invalid value stops the build/server with a clear message
 * (CONVENTIONS.md §8). Never hard-code the platform name or domain.
 */
const schema = z.object({
  PLATFORM_NAME: z.string().min(1),
  PLATFORM_DOMAIN: z.string().min(1),
  TENANT_MODE: z.enum(["path", "subdomain"]),
  /** Where the same-origin proxy sends /api/v1/* (decision 003). No trailing slash. */
  API_URL: z.url().transform((url) => url.replace(/\/+$/, "")),
  /** /styleguide is always on in `next dev`; elsewhere only when "true" (review on staging). */
  STYLEGUIDE_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export type ServerConfig = z.infer<typeof schema>;

export function parseServerConfig(env: Record<string, string | undefined>): ServerConfig {
  const result = schema.safeParse(env);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid or missing environment variables: ${fields}`);
  }
  return result.data;
}

export const serverConfig = parseServerConfig(process.env);
