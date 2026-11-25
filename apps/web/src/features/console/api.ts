import { z } from "zod";

import { ApiError, apiRequest } from "@/lib/api/client";
import { useConsoleSession, type ConsoleSession } from "@/stores/console-session";

import {
  consoleSessionSchema,
  createLabResponseSchema,
  labDetailSchema,
  labSummarySchema,
  signInStepSchema,
  type ConsoleSignInValues,
  type CreateLabOutput,
  type EditLabOutput,
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
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
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
