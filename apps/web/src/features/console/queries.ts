"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { changeLabStatus, createLab, getLab, listLabs, updateLab } from "./api";
import type { CreateLabOutput, EditLabOutput } from "./schemas";

/** Query keys in one place (FRONTEND.md §7): no hand-typed arrays in components. */
export const consoleKeys = {
  labs: () => ["console", "labs"] as const,
  lab: (id: string) => ["console", "labs", id] as const,
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
