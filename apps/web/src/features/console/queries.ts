"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  changeLabStatus,
  changePassword,
  changeTeamMember,
  confirmNewAuthenticator,
  createLab,
  createRecoveryCodes,
  getAccount,
  getLab,
  getTeamMember,
  inviteAdmin,
  listLabs,
  listTeam,
  resendInvite,
  signOutOthers,
  startNewAuthenticator,
  updateLab,
  type TeamAction,
} from "./api";
import type { CreateLabOutput, EditLabOutput, InviteAdminValues } from "./schemas";

/** Query keys in one place (FRONTEND.md §7): no hand-typed arrays in components. */
export const consoleKeys = {
  labs: () => ["console", "labs"] as const,
  lab: (id: string) => ["console", "labs", id] as const,
  team: () => ["console", "team"] as const,
  member: (id: string) => ["console", "team", id] as const,
  account: () => ["console", "account"] as const,
};

/** A fresh key per submit: a double click or a network retry of the SAME submit
 *  reuses it, so the server changes data once (CLAUDE.md "Idempotency-Key"). */
export const newIdempotencyKey = () => crypto.randomUUID();

export function useLabs() {
  return useQuery({ queryKey: consoleKeys.labs(), queryFn: listLabs, staleTime: 30_000 });
}

export function useLab(id: string) {
  return useQuery({ queryKey: consoleKeys.lab(id), queryFn: () => getLab(id), staleTime: 30_000 });
}

export function useCreateLab() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ values, key }: { values: CreateLabOutput; key: string }) =>
      createLab(values, key),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: consoleKeys.labs() }),
  });
}

export function useUpdateLab(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ changes, key }: { changes: Partial<EditLabOutput>; key: string }) =>
      updateLab(id, changes, key),
    onSuccess: (lab) => {
      queryClient.setQueryData(consoleKeys.lab(id), lab);
      return queryClient.invalidateQueries({ queryKey: consoleKeys.labs() });
    },
  });
}

export function useChangeLabStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      action,
      reason,
      key,
    }: {
      action: "suspend" | "reactivate";
      reason: string;
      key: string;
    }) => changeLabStatus(id, action, reason, key),
    onSuccess: (lab) => {
      queryClient.setQueryData(consoleKeys.lab(id), lab);
      return queryClient.invalidateQueries({ queryKey: consoleKeys.labs() });
    },
  });
}

// ── Platform team (decision 019) ─────────────────────────────────────────
export function useTeam() {
  return useQuery({ queryKey: consoleKeys.team(), queryFn: listTeam, staleTime: 30_000 });
}

export function useTeamMember(id: string) {
  return useQuery({
    queryKey: consoleKeys.member(id),
    queryFn: () => getTeamMember(id),
    staleTime: 30_000,
  });
}

export function useInviteAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ values, key }: { values: InviteAdminValues; key: string }) =>
      inviteAdmin(values, key),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: consoleKeys.team() }),
  });
}

export function useResendInvite(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key }: { key: string }) => resendInvite(id, key),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: consoleKeys.team() }),
  });
}

export function useChangeTeamMember(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ action, reason, key }: { action: TeamAction; reason: string; key: string }) =>
      changeTeamMember(id, action, reason, key),
    onSuccess: (member) => {
      queryClient.setQueryData(consoleKeys.member(id), member);
      return queryClient.invalidateQueries({ queryKey: consoleKeys.team() });
    },
  });
}

// ── My account (decision 023) ────────────────────────────────────────────
export function useAccount() {
  return useQuery({ queryKey: consoleKeys.account(), queryFn: getAccount, staleTime: 30_000 });
}

/** Every account change can end other devices or spend codes: read the account again. */
function useRefreshAccount() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: consoleKeys.account() });
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ current, next, key }: { current: string; next: string; key: string }) =>
      changePassword(current, next, key),
    onSuccess: (account) => queryClient.setQueryData(consoleKeys.account(), account),
  });
}

export function useSignOutOthers() {
  const refresh = useRefreshAccount();
  return useMutation({
    mutationFn: ({ key }: { key: string }) => signOutOthers(key),
    onSuccess: refresh,
  });
}

export function useCreateRecoveryCodes() {
  const refresh = useRefreshAccount();
  return useMutation({
    mutationFn: ({ password, code, key }: { password: string; code: string; key: string }) =>
      createRecoveryCodes(password, code, key),
    onSuccess: refresh,
  });
}

export function useStartNewAuthenticator() {
  return useMutation({
    mutationFn: ({ password }: { password: string }) => startNewAuthenticator(password),
  });
}

export function useConfirmNewAuthenticator() {
  const refresh = useRefreshAccount();
  return useMutation({
    mutationFn: ({ challenge, code, key }: { challenge: string; code: string; key: string }) =>
      confirmNewAuthenticator(challenge, code, key),
    onSuccess: refresh,
  });
}
