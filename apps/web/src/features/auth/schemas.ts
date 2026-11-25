import { z } from "zod";

/** Sign-in form. Messages follow DESIGN.md copy: say what to do, sentence case. */
export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .pipe(z.email("Enter an email address like name@example.com.")),
  password: z.string().min(1, "Enter your password."),
});

export type SignInValues = z.infer<typeof signInSchema>;

export const MIN_PASSWORD_LENGTH = 12;

/** First password from an invite (or a new one from a reset). */
export const setPasswordSchema = z
  .object({
    password: z
      .string()
      .min(
        MIN_PASSWORD_LENGTH,
        `Use at least ${MIN_PASSWORD_LENGTH} characters. A short sentence works well.`,
      ),
    confirm: z.string().min(1, "Type the password again."),
  })
  .refine((values) => values.password === values.confirm, {
    path: ["confirm"],
    message: "The two passwords don't match.",
  });
export type SetPasswordValues = z.infer<typeof setPasswordSchema>;

const role = z.enum(["manager", "chief_scientist", "lab_scientist", "front_desk"]);
const section = z.enum(["chem_path", "haematology", "microbiology"]);

/** What the API returns from sign-in and refresh (app/modules/auth/schemas.py). */
export const sessionResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.literal("bearer"),
  expires_in: z.number().int().positive(),
  user: z.object({
    id: z.uuid(),
    full_name: z.string(),
    email: z.string(),
    roles: z.array(role),
    sections: z.array(section),
  }),
  lab: z.object({ name: z.string(), slug: z.string(), timezone: z.string() }),
});

export type SessionResponse = z.infer<typeof sessionResponseSchema>;
export type Role = z.infer<typeof role>;
export type Section = z.infer<typeof section>;
