import { z } from "zod";

// ── API responses (app/modules/platform/schemas.py) ───────────────────────
export const signInStepSchema = z.object({
  step: z.enum(["verify", "setup"]),
  challenge: z.string(),
  setup: z
    .object({
      secret: z.string(),
      otpauth_uri: z.string(),
      // Only our own SVG data URI is accepted as an image source.
      qr_image: z.string().startsWith("data:image/svg+xml"),
    })
    .nullable()
    .optional(),
});
export type SignInStep = z.infer<typeof signInStepSchema>;

export const consoleSessionSchema = z.object({
  access_token: z.string(),
  token_type: z.literal("bearer"),
  expires_in: z.number().int().positive(),
  admin: z.object({ id: z.uuid(), full_name: z.string(), email: z.string() }),
  // Set only after signing in with a recovery code (decision 023).
  recovery_codes_left: z.number().int().nullable().optional(),
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

// ── Platform team (decision 019) ──
export const teamMemberSchema = z.object({
  id: z.uuid(),
  full_name: z.string(),
  email: z.string(),
  status: z.enum(["invited", "active", "deactivated"]),
  two_factor: z.boolean(),
  last_login_at: z.string().nullable(),
  created_at: z.string(),
  invited_by_name: z.string().nullable(),
  deactivated_at: z.string().nullable(),
  invite_expires_at: z.string().nullable(),
});
export type TeamMember = z.infer<typeof teamMemberSchema>;

export const inviteAdminResponseSchema = z.object({
  admin: teamMemberSchema,
  invite_url: z.string().nullable(),
});
export type InviteAdminResult = z.infer<typeof inviteAdminResponseSchema>;

export const inviteLinkSchema = z.object({ invite_url: z.string().nullable() });

export const inviteInfoSchema = z.object({ full_name: z.string(), email: z.string() });

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

export const inviteAdminSchema = z.object({
  full_name: z.string().trim().min(1, "Enter their full name.").max(200),
  email: z
    .string()
    .trim()
    .min(1, "Enter their email.")
    .pipe(z.email("Enter an email address like name@example.com.")),
});
export type InviteAdminValues = z.infer<typeof inviteAdminSchema>;

/** Super-admins hold the keys to every lab: 16 characters, as the CLI asks. */
export const CONSOLE_MIN_PASSWORD = 16;

// ── My account (decision 023) ────────────────────────────────────────────
const totpSetupSchema = z.object({
  secret: z.string(),
  otpauth_uri: z.string(),
  qr_image: z.string().startsWith("data:image/svg+xml"),
});

export const accountSchema = z.object({
  id: z.uuid(),
  full_name: z.string(),
  email: z.string(),
  created_at: z.string(),
  last_login_at: z.string().nullable(),
  password_changed_at: z.string().nullable(),
  two_factor: z.boolean(),
  recovery_codes_left: z.number().int(),
  recovery_codes_created_at: z.string().nullable(),
  sessions: z.array(
    z.object({
      id: z.uuid(),
      user_agent: z.string().nullable(),
      signed_in_at: z.string(),
      last_used_at: z.string(),
      current: z.boolean(),
    }),
  ),
});
export type Account = z.infer<typeof accountSchema>;
export type AccountDevice = Account["sessions"][number];

export const recoveryCodesSchema = z.object({
  codes: z.array(z.string()).nullable(),
  created_at: z.string(),
});

export const newAuthenticatorSchema = z.object({ challenge: z.string(), setup: totpSetupSchema });
export type NewAuthenticator = z.infer<typeof newAuthenticatorSchema>;

export const sessionsEndedSchema = z.object({ ended: z.number().int() });

/** The full set the API makes; fewer than this many left is worth a nudge. */
export const RECOVERY_CODE_COUNT = 10;
export const RECOVERY_CODES_LOW = 3;

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password."),
    new_password: z
      .string()
      .min(
        CONSOLE_MIN_PASSWORD,
        `Use at least ${CONSOLE_MIN_PASSWORD} characters. A short sentence works well.`,
      ),
    confirm: z.string().min(1, "Type the new password again."),
  })
  .refine((values) => values.new_password === values.confirm, {
    message: "The two passwords don't match.",
    path: ["confirm"],
  })
  .refine((values) => values.new_password !== values.current_password, {
    message: "Choose a password you haven't been using.",
    path: ["new_password"],
  });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const passwordSchema = z.object({
  password: z.string().min(1, "Enter your password."),
});
export type PasswordValues = z.infer<typeof passwordSchema>;

export const passwordAndCodeSchema = passwordSchema.extend(codeSchema.shape);
export type PasswordAndCodeValues = z.input<typeof passwordAndCodeSchema>;
export type PasswordAndCodeOutput = z.output<typeof passwordAndCodeSchema>;

/** As typed from paper: any case, spaces or dashes. The API normalises it again. */
export const recoveryCodeSchema = z.object({
  recovery_code: z
    .string()
    .transform((value) => value.replace(/[\s-]/g, "").toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9]{16}$/, "Enter all 16 characters of one recovery code.")),
});
export type RecoveryCodeValues = z.input<typeof recoveryCodeSchema>;
export type RecoveryCodeOutput = z.output<typeof recoveryCodeSchema>;
