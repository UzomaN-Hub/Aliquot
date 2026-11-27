"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { Modal } from "@/components/ui/modal";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { toApiError } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format/dates";
import { firstName } from "@/lib/format/labels";
import { useConsoleSession } from "@/stores/console-session";

import { newIdempotencyKey, useInviteAdmin, useTeam } from "../queries";
import { inviteAdminSchema, type InviteAdminResult, type InviteAdminValues } from "../schemas";
import { teamStatus, type TeamStatus } from "../team-status";
import { OneTimeLink } from "./one-time-link";

export const toneClass: Record<TeamStatus["tone"], string> = {
  plain: "",
  muted: "text-ink-muted",
  alert: "font-semibold text-eosin-text",
};

/**
 * Platform team (decision 019): every super-admin, their state and their last
 * sign-in. Square rows on hairlines; the profile holds the actions.
 */
export function TeamList() {
  const team = useTeam();
  const me = useConsoleSession((state) => state.session?.admin.id);
  const [inviting, setInviting] = useState(false);

  const members = team.data ?? [];
  const current = members.filter((member) => member.status !== "deactivated").length;
  const pending = members.filter((member) => member.status === "invited").length;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-1">
          <p className="text-body text-ink-muted">Platform team</p>
          <h1 className="text-display font-medium">
            {team.isSuccess
              ? `${current} ${current === 1 ? "super-admin" : "super-admins"}`
              : "Super-admins"}
          </h1>
          {pending > 0 && (
            <p className="text-body text-ink-secondary">
              {pending} waiting on {pending === 1 ? "an invite" : "invites"}
            </p>
          )}
        </div>
        <Button onClick={() => setInviting(true)}>Invite a super-admin</Button>
      </div>

      {team.isPending && <TeamSkeleton />}
      {team.isError && (
        <div className="flex flex-col items-start gap-3">
          <FormError message={team.error.message} />
          <Button variant="link" onClick={() => void team.refetch()}>
            Try again
          </Button>
        </div>
      )}
      {team.isSuccess && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-body">
            <thead>
              <tr className="border-b border-hairline text-caption text-ink-muted">
                <th scope="col" className="py-3 pr-6 font-normal">
                  Name
                </th>
                <th scope="col" className="py-3 pr-6 font-normal">
                  Status
                </th>
                <th scope="col" className="py-3 pr-6 font-normal">
                  Two-step sign-in
                </th>
                <th scope="col" className="py-3 text-right font-normal">
                  Last sign-in
                </th>
              </tr>
            </thead>
            <tbody className="stagger">
              {members.map((member) => {
                const status = teamStatus(member);
                return (
                  <tr
                    key={member.id}
                    className="border-b border-hairline transition-colors hover:bg-hover"
                  >
                    <td className="py-3 pr-6">
                      <Link
                        href={`/console/team/${member.id}`}
                        className="font-medium underline decoration-transparent underline-offset-4 hover:decoration-ink-faint"
                      >
                        {member.full_name}
                      </Link>
                      {member.id === me && <span className="ml-2 text-ink-muted">(you)</span>}
                      <span className="block text-caption text-ink-muted">{member.email}</span>
                    </td>
                    <td className={cn("pr-6", toneClass[status.tone])}>{status.text}</td>
                    <td className="pr-6">
                      {member.two_factor ? "On" : <span className="text-ink-muted">Not yet</span>}
                    </td>
                    <td className="text-right text-ink-secondary">
                      {member.last_login_at ? formatDateTime(member.last_login_at) : "Never"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <InviteDialog open={inviting} onOpenChange={setInviting} />
    </div>
  );
}

/** Name and email, then the link shown once. */
function InviteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const invite = useInviteAdmin();
  const [result, setResult] = useState<InviteAdminResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InviteAdminValues>({
    resolver: zodResolver(inviteAdminSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: { full_name: "", email: "" },
  });

  function close(next: boolean) {
    onOpenChange(next);
    if (!next) {
      reset();
      setResult(null);
      setFormError(null);
    }
  }

  async function onSubmit(values: InviteAdminValues) {
    setFormError(null);
    try {
      setResult(await invite.mutateAsync({ values, key: newIdempotencyKey() }));
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.field === "email" || apiError.field === "full_name") {
        setError(apiError.field, { message: apiError.message });
      } else {
        setFormError(apiError.message);
      }
    }
  }

  if (result) {
    const name = firstName(result.admin.full_name);
    return (
      <Modal
        open={open}
        onOpenChange={close}
        title={`${name} is invited`}
        description={
          result.invite_url
            ? `Send ${name} this link yourself. It works once, expires in 72 hours, and is shown only now. After choosing a password, ${name} sets up two-step sign-in at the first sign-in.`
            : "This invite was made by an earlier attempt, and its link was shown then. Make a new link from their profile."
        }
      >
        <div className="flex flex-col gap-6">
          {result.invite_url && <OneTimeLink url={result.invite_url} label="Invite link" />}
          <Button variant="link" className="self-start" onClick={() => close(false)}>
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onOpenChange={close}
      title="Invite a super-admin"
      description="They'll manage every lab on the platform, as you do. Like you, they never see patient data."
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <FormError message={formError} />
        <Field label="Full name" error={errors.full_name?.message}>
          <Input autoComplete="off" {...register("full_name")} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="off" {...register("email")} />
        </Field>
        <div className="flex items-center gap-6">
          <Button type="submit" size="lg" pending={isSubmitting} pendingLabel="Creating link…">
            Create invite link
          </Button>
          <Button variant="link" onClick={() => close(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function TeamSkeleton() {
  return (
    <SkeletonGroup label="Loading the team">
      <div className="flex flex-col">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex h-14 items-center gap-6 border-b border-hairline">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </SkeletonGroup>
  );
}
