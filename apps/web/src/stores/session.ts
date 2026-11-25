import { create } from "zustand";

import type { Role, Section } from "@/features/auth/schemas";

/**
 * The signed-in session, in memory only (FRONTEND.md §6, §13). Never persisted:
 * a reload asks the API for a fresh token through the httpOnly refresh cookie.
 */
export type Session = {
  accessToken: string;
  /** Epoch ms when the access token expires. */
  expiresAt: number;
  user: { id: string; fullName: string; email: string; roles: Role[]; sections: Section[] };
  lab: { name: string; slug: string; timezone: string };
};

type SessionState = {
  session: Session | null;
  setSession: (session: Session) => void;
  clearSession: () => void;
};

export const useSessionStore = create<SessionState>()((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  clearSession: () => set({ session: null }),
}));
