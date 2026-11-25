import { z } from "zod";

// ── API responses (app/modules/platform/schemas.py) ───────────────────────
export const signInStepSchema = z.object({
  step: z.enum(["verify", "setup"]),
  challenge: z.string(),
  setup: z
    .object({ secret: z.string(), otpauth_uri: z.string(), qr_svg: z.string() })
    .nullable()
    .optional(),
});
export type SignInStep = z.infer<typeof signInStepSchema>;

export const consoleSessionSchema = z.object({
  access_token: z.string(),
  token_type: z.literal("bearer"),
  expires_in: z.number().int().positive(),
  admin: z.object({ id: z.uuid(), full_name: z.string(), email: z.string() }),
});

const section = z.enum(["chem_path", "haematology", "microbiology"]);

export const labSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  status: z.enum(["active", "suspended"]),
  staff_count: z.number().int(),
  created_at: z.string(),
  suspended_at: z.string().nullable(),
});
export type LabSummary = z.infer<typeof labSummarySchema>;

export const labDetailSchema = labSummarySchema.extend({
  legal_name: z.string().nullable(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  timezone: z.string(),
  sections: z.array(section),
});
export type LabDetail = z.infer<typeof labDetailSchema>;

export const createLabResponseSchema = z.object({
  lab: labDetailSchema,
  invite_url: z.string().nullable(),
});
export type CreateLabResult = z.infer<typeof createLabResponseSchema>;

// ── Forms ─────────────────────────────────────────────────────────────────
export const consoleSignInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .pipe(z.email("Enter an email address like name@example.com.")),
  password: z.string().min(1, "Enter your password."),
});
export type ConsoleSignInValues = z.infer<typeof consoleSignInSchema>;

export const codeSchema = z.object({
  code: z
    .string()
    .transform((value) => value.replace(/\s/g, ""))
    .pipe(z.string().regex(/^\d{6}$/, "Enter the 6 digits from your authenticator app.")),
});
export type CodeValues = z.input<typeof codeSchema>;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value));

export const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$/;

export const createLabSchema = z.object({
  name: z.string().trim().min(1, "Enter the lab's name.").max(200),
  slug: z
    .string()
    .trim()
    .min(1, "Choose the lab's address.")
    .regex(
      SLUG_PATTERN,
      "Use lowercase letters, numbers and hyphens; start and end with a letter or number.",
    ),
  address: optionalText(500),
  phone: optionalText(40),
  email: optionalText(254),
  legal_name: optionalText(200),
  timezone: z.string().min(1),
  sections: z.array(section).min(1, "Choose at least one section."),
  manager_name: z.string().trim().min(1, "Enter the Manager's full name.").max(200),
  manager_email: z
    .string()
    .trim()
    .min(1, "Enter the Manager's email.")
    .pipe(z.email("Enter an email address like name@example.com.")),
});
export type CreateLabValues = z.input<typeof createLabSchema>;
export type CreateLabOutput = z.output<typeof createLabSchema>;

export const editLabSchema = createLabSchema.pick({
  name: true,
  address: true,
  phone: true,
  email: true,
  legal_name: true,
  timezone: true,
});
export type EditLabValues = z.input<typeof editLabSchema>;
export type EditLabOutput = z.output<typeof editLabSchema>;

export const reasonSchema = z.object({
  reason: z.string().trim().min(3, "Say why, in a few words. It goes in the audit log.").max(500),
});
export type ReasonValues = z.infer<typeof reasonSchema>;

/** "Tavnit Labs Ikeja" → "tavnit-labs-ikeja": a suggestion the person can edit. */
export function suggestSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}
