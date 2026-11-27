"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { Modal } from "@/components/ui/modal";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { toApiError } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { formatDate, formatDateTime } from "@/lib/format/dates";
import { firstName } from "@/lib/format/labels";
import { useConsoleSession } from "@/stores/console-session";

import type { TeamAction } from "../api";
import { newIdempotencyKey, useChangeTeamMember, useResendInvite, useTeamMember } from "../queries";
import { reasonSchema, type ReasonValues, type TeamMember as Member } from "../schemas";
import { teamStatus } from "../team-status";
import { OneTimeLink } from "./one-time-link";
import { toneClass } from "./team-list";

/** A super-admin's profile (decision 019): who they are, their state, what can be done. */
export function TeamMember({ id }: { id: string }) {
  const member = useTeamMember(id);
  const me = useConsoleSession((state) => state.session?.admin.id);

  if (member.isPending) return <ProfileSkeleton />;
  if (member.isError) {
    const missing = toApiError(member.error).status === 404;
    return (
      <div className="flex flex-col items-start gap-3">
        <h1 className="text-title font-medium">
          {missing ? "This super-admin doesn't exist." : "We can't load this profile right now."}
        </h1>
        {missing ? (
          <Button variant="link" asChild>
            <Link href="/console/team">Back to the team</Link>
          </Button>
        ) : (
          <Button variant="link" onClick={() => void member.refetch()}>
            Try again
          </Button>
        )}
      </div>
    );
  }

  const data = member.data;
  const status = teamStatus(data);
  const isMe = data.id === me;

  return (
    <div className="flex max-w-4xl flex-col gap-10">
      <div className="flex flex-col gap-2">
        <Link href="/console/team" className="text-body text-ink-muted hover:text-ink">
          ← Team
        </Link>
        <h1 className="text-display font-medium">
          {data.full_name}
          {isMe && <span className="ml-3 text-title text-ink-muted">(you)</span>}
        </h1>
        <p className={cn("text-body", toneClass[status.tone] || "text-ink-secondary")}>
          {status.text}
        </p>
      </div>

      <dl className="stagger grid gap-x-10 gap-y-6 [--stagger-start:120ms] sm:grid-cols-2">
        <Fact label="Email" value={data.email} />
        <Fact
          label="Two-step sign-in"
          value={data.two_factor ? "On" : "Not set up yet: asked for at the next sign-in"}
        />
        <Fact
          label="Last sign-in"
          value={data.last_login_at ? formatDateTime(data.last_login_at) : "Never"}
        />
        <Fact
          label="Added"
          value={`${formatDate(data.created_at)}, ${
            data.invited_by_name ? `invited by ${data.invited_by_name}` : "from the command line"
          }`}
        />
        {data.deactivated_at && (
          <Fact label="Deactivated" value={formatDateTime(data.deactivated_at)} />
        )}
      </dl>

      <div className="flex flex-wrap items-center gap-8 border-t border-hairline pt-8">
        {isMe ? (
          <p className="text-body-lg text-ink-secondary">
            This is you. Another super-admin can reset or deactivate your account; you can&apos;t do
            it to yourself, so the platform always keeps someone who can sign in.
          </p>
        ) : (
          <Actions member={data} />
        )}
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-hairline pb-4">
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd className="text-body-lg">{value}</dd>
    </div>
  );
}

function Actions({ member }: { member: Member }) {
  const name = firstName(member.full_name);
  if (member.status === "invited") {
    return (
      <>
        <NewInviteLink member={member} />
        <ReasonAction
          member={member}
          action="deactivate"
          label="Cancel invite"
          title={`Cancel ${name}'s invite?`}
          description="Their link stops working at once. You can reactivate them later and send a new link."
          verb="Cancel invite"
          pendingLabel="Cancelling…"
          danger
        />
      </>
    );
  }
  if (member.status === "deactivated") {
    return (
      <ReasonAction
        member={member}
        action="reactivate"
        label={`Reactivate ${name}`}
        title={`Reactivate ${name}?`}
        description={`${name} can sign in again with their own password and two-step sign-in.`}
        verb="Reactivate"
        pendingLabel="Reactivating…"
      />
    );
  }
  return (
    <>
      <ReasonAction
        member={member}
        action="reset-2fa"
        label="Reset two-step sign-in"
        title={`Reset ${name}'s two-step sign-in?`}
        description={`For a lost or replaced phone. ${name} is signed out everywhere now, and the next sign-in shows a new QR code to scan. Their password stays the same.`}
        verb="Reset two-step sign-in"
        pendingLabel="Resetting…"
      />
      <ReasonAction
        member={member}
        action="deactivate"
        label={`Deactivate ${name}`}
        title={`Deactivate ${name}?`}
        description={`${name} is signed out everywhere at once and can't sign in. Nothing is deleted, and everything ${name} did stays in the audit log. You can reactivate them later.`}
        verb="Deactivate"
        pendingLabel="Deactivating…"
        danger
      />
    </>
  );
}

/** A change to someone's access: the consequence, a reason for the audit log, a verb. */
function ReasonAction({
  member,
  action,
  label,
  title,
  description,
  verb,
  pendingLabel,
  danger,
}: {
  member: Member;
  action: TeamAction;
  label: string;
  title: string;
  description: string;
  verb: string;
  pendingLabel: string;
  danger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const change = useChangeTeamMember(member.id);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReasonValues>({
    resolver: zodResolver(reasonSchema),
    mode: "onSubmit",
    defaultValues: { reason: "" },
  });

  function close(next: boolean) {
    setOpen(next);
    if (!next) {
      reset();
      setFormError(null);
    }
  }

  async function onSubmit({ reason }: ReasonValues) {
    setFormError(null);
    try {
      await change.mutateAsync({ action, reason, key: newIdempotencyKey() });
      close(false);
    } catch (error) {
      setFormError(toApiError(error).message);
    }
  }

  return (
    <>
      <Button
        variant="link"
        className={danger ? "text-eosin-text" : undefined}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      <Modal open={open} onOpenChange={close} title={title} description={description}>
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <FormError message={formError} />
          <Field label="Reason" hint="Kept in the audit log." error={errors.reason?.message}>
            <Textarea rows={3} {...register("reason")} />
          </Field>
          <div className="flex items-center gap-6">
            <Button type="submit" size="lg" pending={isSubmitting} pendingLabel={pendingLabel}>
              {verb}
            </Button>
            <Button variant="link" onClick={() => close(false)}>
              Keep as is
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

/** A fresh link for someone who hasn't accepted yet; the old one stops working. */
function NewInviteLink({ member }: { member: Member }) {
  const resend = useResendInvite(member.id);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const name = firstName(member.full_name);

  async function make() {
    setError(null);
    try {
      const result = await resend.mutateAsync({ key: newIdempotencyKey() });
      setUrl(result.invite_url);
      setOpen(true);
    } catch (failure) {
      setError(toApiError(failure).message);
    }
  }

  return (
    <>
      <Button
        variant="link"
        pending={resend.isPending}
        pendingLabel="Making a link…"
        onClick={() => void make()}
      >
        Make a new invite link
      </Button>
      {error && <FormError message={error} />}
      <Modal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setUrl(null);
        }}
        title={`New invite link for ${name}`}
        description="The previous link no longer works. This one works once, expires in 72 hours, and is shown only now."
      >
        <div className="flex flex-col gap-6">
          {url && <OneTimeLink url={url} label="Invite link" />}
          <Button variant="link" className="self-start" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </Modal>
    </>
  );
}

function ProfileSkeleton() {
  return (
    <SkeletonGroup label="Loading profile">
      <div className="flex max-w-4xl flex-col gap-8">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-5 w-40" />
        <div className="grid gap-6 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </SkeletonGroup>
  );
}
