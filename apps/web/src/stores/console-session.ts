import { create } from "zustand";

/** The super-admin's console session, in memory only (like the lab session). */
export type ConsoleSession = {
  accessToken: string;
  expiresAt: number;
  admin: { id: string; fullName: string; email: string };
  /** Set when this session began with a recovery code: how many are left. */
  recoveryCodesLeft?: number;
};

type ConsoleSessionState = {
  session: ConsoleSession | null;
  setSession: (session: ConsoleSession) => void;
  clearSession: () => void;
};

export const useConsoleSession = create<ConsoleSessionState>()((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  clearSession: () => set({ session: null }),
}));
