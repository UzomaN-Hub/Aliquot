import { ApiError, apiRequest } from "@/lib/api/client";
import type { Session } from "@/stores/session";

import { sessionResponseSchema, type SessionResponse, type SignInValues } from "./schemas";

// Cookie routes need this header; a cross-site form can't send it (decision 013).
const CSRF = { "X-CSRF-Protection": "1" };

function toSession(response: SessionResponse): Session {
  return {
    accessToken: response.access_token,
    expiresAt: Date.now() + response.expires_in * 1000,
    user: {
      id: response.user.id,
      fullName: response.user.full_name,
      email: response.user.email,
      roles: response.user.roles,
      sections: response.user.sections,
    },
    lab: response.lab,
  };
}

export async function signIn(lab: string, values: SignInValues): Promise<Session> {
  const response = await apiRequest("/auth/sign-in", sessionResponseSchema, {
    method: "POST",
    body: { lab, ...values },
  });
  return toSession(response);
}

/**
 * New access token from the refresh cookie, or null when the session has ended.
 *
 * Runs under a Web Lock so only ONE tab refreshes at a time. Two tabs sending the
 * same refresh token would look like theft and end the session (ARCHITECTURE.md §9).
 * A tab that waited then sends the cookie the first tab just rotated.
 */
export async function refreshSession(lab: string): Promise<Session | null> {
  const run = async (): Promise<Session | null> => {
    try {
      const response = await apiRequest("/auth/refresh", sessionResponseSchema, {
        method: "POST",
        body: { lab },
        headers: CSRF,
      });
      return toSession(response);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  };
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(`auth-refresh:${lab}`, run);
  }
  return run();
}

export async function signOut(lab: string): Promise<void> {
  await apiRequest("/auth/sign-out", null, { method: "POST", body: { lab }, headers: CSRF });
}
