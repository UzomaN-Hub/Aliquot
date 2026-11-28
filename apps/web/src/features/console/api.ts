import { z } from "zod";

import { ApiError, apiRequest } from "@/lib/api/client";
import { useConsoleSession, type ConsoleSession } from "@/stores/console-session";

import {
  accountSchema,
  consoleSessionSchema,
  createLabResponseSchema,
  inviteAdminResponseSchema,
  inviteInfoSchema,
  inviteLinkSchema,
  labDetailSchema,
  labSummarySchema,
  newAuthenticatorSchema,
  recoveryCodesSchema,
  sessionsEndedSchema,
  signInStepSchema,
  teamMemberSchema,
  type ConsoleSignInValues,
  type CreateLabOutput,
  type EditLabOutput,
  type InviteAdminValues,
} from "./schemas";

const CSRF = { "X-CSRF-Protection": "1" };

function toSession(response: z.infer<typeof consoleSessionSchema>): ConsoleSession {
  return {
    accessToken: response.access_token,
    expiresAt: Date.now() + response.expires_in * 1000,
    admin: {
      id: response.admin.id,
      fullName: response.admin.full_name,
      email: response.admin.email,
    },
    ...(response.recovery_codes_left != null && {
      recoveryCodesLeft: response.recovery_codes_left,
    }),
  };
}

// ── Sign-in ───────────────────────────────────────────────────────────────
export function startSignIn(values: ConsoleSignInValues) {
  return apiRequest("/platform/auth/sign-in", signInStepSchema, { method: "POST", body: values });
}

export async function verifyCode(challenge: string, code: string): Promise<ConsoleSession> {
  const response = await apiRequest("/platform/auth/verify", consoleSessionSchema, {
    method: "POST",
    body: { challenge, code },
  });
  return toSession(response);
}

/** Step 2 without the phone: one single-use recovery code (decision 023). */
export async function verifyRecoveryCode(
  challenge: string,
  recoveryCode: string,
): Promise<ConsoleSession> {
  const response = await apiRequest("/platform/auth/recover", consoleSessionSchema, {
    method: "POST",
    body: { challenge, recovery_code: recoveryCode },
  });
  return toSession(response);
}

/** New token from the console cookie, or null. One tab at a time (Web Locks). */
export async function refreshConsole(): Promise<ConsoleSession | null> {
  const run = async () => {
    try {
      const response = await apiRequest("/platform/auth/refresh", consoleSessionSchema, {
        method: "POST",
        headers: CSRF,
      });
      return toSession(response);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  };
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request("auth-refresh:console", run);
  }
  return run();
}

export async function signOutConsole(): Promise<void> {
  await apiRequest("/platform/auth/sign-out", null, { method: "POST", headers: CSRF });
}

/**
 * The 401s that mean "this sign-in is over". Other 401s are a wrong answer the person
 * gave (a password, a 2FA or recovery code): refreshing and retrying those would send
 * the same wrong answer twice, count it twice toward the lock, and could sign them out.
 */
const SIGN_IN_ENDED = new Set(["not_signed_in", "token_expired", "session_ended"]);

/**
 * Calls the API with the console token. A token about to expire is renewed first;
 * a 401 triggers one refresh and one retry (FRONTEND.md §5). If the session has
 * truly ended, the store is cleared and the gate sends the person to sign-in.
 */
async function withToken<T>(call: (token: string) => Promise<T>): Promise<T> {
  const store = useConsoleSession.getState();
  let session = store.session;
  if (!session || session.expiresAt - Date.now() < 30_000) {
    session = await refreshConsole();
    if (session) store.setSession(session);
  }
  if (!session) {
    store.clearSession();
    throw new ApiError(401, "session_ended", "Your session has ended. Sign in again.");
  }
  try {
    return await call(session.accessToken);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || !SIGN_IN_ENDED.has(error.code)) {
      throw error;
    }
    const fresh = await refreshConsole();
    if (!fresh) {
      store.clearSession();
      throw error;
    }
    store.setSession(fresh);
    return call(fresh.accessToken);
  }
}

// ── Labs ──────────────────────────────────────────────────────────────────
export const listLabs = () =>
  withToken((token) =>
    apiRequest("/platform/labs", z.array(labSummarySchema), { accessToken: token }),
  );

export const getLab = (id: string) =>
  withToken((token) => apiRequest(`/platform/labs/${id}`, labDetailSchema, { accessToken: token }));

export function createLab(values: CreateLabOutput, idempotencyKey: string) {
  const { manager_name, manager_email, ...lab } = values;
  return withToken((token) =>
    apiRequest("/platform/labs", createLabResponseSchema, {
      method: "POST",
      accessToken: token,
      headers: { "Idempotency-Key": idempotencyKey },
      body: { ...lab, manager: { full_name: manager_name, email: manager_email } },
    }),
  );
}

export function updateLab(id: string, changes: Partial<EditLabOutput>, idempotencyKey: string) {
  return withToken((token) =>
    apiRequest(`/platform/labs/${id}`, labDetailSchema, {
      method: "PATCH",
      accessToken: token,
      headers: { "Idempotency-Key": idempotencyKey },
      body: changes,
    }),
  );
}

export function changeLabStatus(
  id: string,
  action: "suspend" | "reactivate",
  reason: string,
  idempotencyKey: string,
) {
  return withToken((token) =>
    apiRequest(`/platform/labs/${id}/${action}`, labDetailSchema, {
      method: "POST",
      accessToken: token,
      headers: { "Idempotency-Key": idempotencyKey },
      body: { reason },
    }),
  );
}

// ── Platform team (decision 019) ─────────────────────────────────────────
export const listTeam = () =>
  withToken((token) =>
    apiRequest("/platform/admins", z.array(teamMemberSchema), { accessToken: token }),
  );

export const getTeamMember = (id: string) =>
  withToken((token) =>
    apiRequest(`/platform/admins/${id}`, teamMemberSchema, { accessToken: token }),
  );

export function inviteAdmin(values: InviteAdminValues, idempotencyKey: string) {
  return withToken((token) =>
    apiRequest("/platform/admins", inviteAdminResponseSchema, {
      method: "POST",
      accessToken: token,
      headers: { "Idempotency-Key": idempotencyKey },
      body: values,
    }),
  );
}

export function resendInvite(id: string, idempotencyKey: string) {
  return withToken((token) =>
    apiRequest(`/platform/admins/${id}/invite`, inviteLinkSchema, {
      method: "POST",
      accessToken: token,
      headers: { "Idempotency-Key": idempotencyKey },
    }),
  );
}

export type TeamAction = "deactivate" | "reactivate" | "reset-2fa";

export function changeTeamMember(
  id: string,
  action: TeamAction,
  reason: string,
  idempotencyKey: string,
) {
  return withToken((token) =>
    apiRequest(`/platform/admins/${id}/${action}`, teamMemberSchema, {
      method: "POST",
      accessToken: token,
      headers: { "Idempotency-Key": idempotencyKey },
      body: { reason },
    }),
  );
}

/** Public: the invite link is the proof. The token travels in the body, never a URL. */
export function checkConsoleInvite(token: string) {
  return apiRequest("/platform/auth/invite/check", inviteInfoSchema, {
    method: "POST",
    body: { token },
  });
}

export async function acceptConsoleInvite(token: string, password: string): Promise<void> {
  await apiRequest("/platform/auth/invite/accept", null, {
    method: "POST",
    body: { token, password },
  });
}

// ── My account (decision 023) ────────────────────────────────────────────
export const getAccount = () =>
  withToken((token) => apiRequest("/platform/account", accountSchema, { accessToken: token }));

export function changePassword(
  currentPassword: string,
  newPassword: string,
  idempotencyKey: string,
) {
  return withToken((token) =>
    apiRequest("/platform/account/password", accountSchema, {
      method: "POST",
      accessToken: token,
      headers: { "Idempotency-Key": idempotencyKey },
      body: { current_password: currentPassword, new_password: newPassword },
    }),
  );
}

export function signOutOthers(idempotencyKey: string) {
  return withToken((token) =>
    apiRequest("/platform/account/sign-out-others", sessionsEndedSchema, {
      method: "POST",
      accessToken: token,
      headers: { "Idempotency-Key": idempotencyKey },
    }),
  );
}

export function createRecoveryCodes(password: string, code: string, idempotencyKey: string) {
  return withToken((token) =>
    apiRequest("/platform/account/recovery-codes", recoveryCodesSchema, {
      method: "POST",
      accessToken: token,
      headers: { "Idempotency-Key": idempotencyKey },
      body: { password, code },
    }),
  );
}

export function startNewAuthenticator(password: string) {
  return withToken((token) =>
    apiRequest("/platform/account/authenticator", newAuthenticatorSchema, {
      method: "POST",
      accessToken: token,
      body: { password },
    }),
  );
}

export function confirmNewAuthenticator(challenge: string, code: string, idempotencyKey: string) {
  return withToken((token) =>
    apiRequest("/platform/account/authenticator/confirm", sessionsEndedSchema, {
      method: "POST",
      accessToken: token,
      headers: { "Idempotency-Key": idempotencyKey },
      body: { challenge, code },
    }),
  );
}
