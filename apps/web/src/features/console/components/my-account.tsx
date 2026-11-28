"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";

import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { Modal } from "@/components/ui/modal";
import { PasswordInput } from "@/components/ui/password-input";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { toApiError } from "@/lib/api/client";
import { formatDate, formatDateTime } from "@/lib/format/dates";
import { useConsoleSession } from "@/stores/console-session";

import { describeDevice } from "../devices";
import { newIdempotencyKey, useAccount, useChangePassword, useSignOutOthers } from "../queries";
import {
  CONSOLE_MIN_PASSWORD,
  RECOVERY_CODE_COUNT,
  RECOVERY_CODES_LOW,
  changePasswordSchema,
  type Account,
  type ChangePasswordValues,
} from "../schemas";
import { NewPhone, RecoveryCodes } from "./account-security";

/**
 * My account (decision 023): the super-admin's own password, two-step sign-in,
 * recovery codes and signed-in devices. Every change asks for the password again.
 */
export function MyAccount() {
  const account = useAccount();
  const recoveredWith = useConsoleSession((state) => state.session?.recoveryCodesLeft);

  if (account.isPending) return <AccountSkeleton />;
  if (account.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <h1 className="text-title font-medium">We can&apos;t load your account right now.</h1>
        <Button variant="link" onClick={() => void account.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const data = account.data;
  return (
    <div className="flex max-w-4xl flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-display font-medium">My account</h1>
        <p className="text-body-lg text-ink-secondary">
          {data.full_name} · {data.email}
        </p>
      </div>

      {recoveredWith !== undefined && (
        <Banner severity="warning">
          {recoveredWith === 0
            ? "You signed in with your last recovery code. Make a new set below, and move two-step sign-in to a new phone if yours is gone."
            : `You signed in with a recovery code; ${recoveredWith} left. If your phone is gone, move two-step sign-in to a new phone below.`}
        </Banner>
      )}

      <div className="stagger flex flex-col [--stagger-start:120ms]">
        <Section
          title="Password"
          summary={
            data.password_changed_at
              ? `Last changed ${formatDate(data.password_changed_at)}`
              : `Not changed since you joined on ${formatDate(data.created_at)}`
          }
          action={<ChangePassword />}
        />
        <Section
          title="Two-step sign-in"
          summary={data.two_factor ? "On: codes from your authenticator app" : "Not set up yet"}
          action={<NewPhone />}
        />
        <Section
          title="Recovery codes"
          summary={<RecoverySummary account={data} />}
          action={<RecoveryCodes account={data} />}
        />
        <Devices account={data} />
      </div>
    </div>
  );
}

function Section({
  title,
  summary,
  action,
  children,
}: {
  title: string;
  summary: ReactNode;
  action: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="grid gap-4 border-t border-hairline py-8 sm:grid-cols-[1fr_auto] sm:gap-10"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-title font-medium">{title}</h2>
        <div className="text-body-lg text-ink-secondary">{summary}</div>
        {children}
      </div>
      <div className="flex flex-col items-start gap-2 sm:items-end">{action}</div>
    </section>
  );
}

function RecoverySummary({ account }: { account: Account }) {
  const left = account.recovery_codes_left;
  if (left === 0) {
    return (
      <span className="font-medium text-ink">
        None yet. Make a set now, so a lost phone doesn&apos;t lock you out.
      </span>
    );
  }
  return (
    <>
      {left} of {RECOVERY_CODE_COUNT} left
      {account.recovery_codes_created_at &&
        `, made ${formatDate(account.recovery_codes_created_at)}`}
      {left <= RECOVERY_CODES_LOW && (
        <span className="block font-medium text-ink">Running low: make a new set.</span>
      )}
    </>
  );
}

// ── Password ─────────────────────────────────────────────────────────────
function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <>
      <Button
        variant="link"
        onClick={() => {
          setDone(false);
          setOpen(true);
        }}
      >
        Change password
      </Button>
      <span role="status" className="text-body text-ink-secondary sm:text-right">
        {done ? "Password changed. Your other devices were signed out." : ""}
      </span>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Change your password"
        description="Your other devices are signed out; this one stays signed in."
      >
        <ChangePasswordForm
          onDone={() => {
            setOpen(false);
            setDone(true);
          }}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}

function ChangePasswordForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const change = useChangePassword();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onSubmit",
    defaultValues: { current_password: "", new_password: "", confirm: "" },
  });

  async function onSubmit(values: ChangePasswordValues) {
    setFormError(null);
    try {
      await change.mutateAsync({
        current: values.current_password,
        next: values.new_password,
        key: newIdempotencyKey(),
      });
      onDone();
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.field === "current_password" || apiError.field === "new_password") {
        setError(apiError.field, { message: apiError.message }, { shouldFocus: true });
      } else {
        setFormError(apiError.message);
      }
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <FormError message={formError} />
      <Field label="Current password" error={errors.current_password?.message}>
        <PasswordInput autoComplete="current-password" {...register("current_password")} />
      </Field>
      <Field
        label="New password"
        hint={`At least ${CONSOLE_MIN_PASSWORD} characters. A short sentence works well.`}
        error={errors.new_password?.message}
      >
        <PasswordInput autoComplete="new-password" {...register("new_password")} />
      </Field>
      <Field label="Type it again" error={errors.confirm?.message}>
        <PasswordInput autoComplete="new-password" {...register("confirm")} />
      </Field>
      <div className="flex items-center gap-6">
        <Button type="submit" size="lg" pending={isSubmitting} pendingLabel="Changing…">
          Change password
        </Button>
        <Button variant="link" onClick={onCancel}>
          Keep my password
        </Button>
      </div>
    </form>
  );
}

// ── Signed-in devices ────────────────────────────────────────────────────
function Devices({ account }: { account: Account }) {
  const others = account.sessions.filter((device) => !device.current).length;
  return (
    <Section
      title="Signed-in devices"
      summary={
        others === 0
          ? "Only this device is signed in."
          : `This device and ${others} other${others === 1 ? "" : "s"}.`
      }
      action={<SignOutOthers others={others} />}
    >
      <ul className="mt-4 flex flex-col">
        {account.sessions.map((device) => (
          <li
            key={device.id}
            className="flex flex-col gap-0.5 border-b border-hairline py-3 last:border-b-0"
          >
            <p className="text-body-lg font-medium">
              {describeDevice(device.user_agent)}
              {device.current && (
                <span className="ml-2 font-normal text-ink-muted">· this device</span>
              )}
            </p>
            <p className="text-body text-ink-muted">
              Signed in {formatDateTime(device.signed_in_at)} · last active{" "}
              {formatDateTime(device.last_used_at)}
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function SignOutOthers({ others }: { others: number }) {
  const [open, setOpen] = useState(false);
  const [ended, setEnded] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const signOut = useSignOutOthers();

  async function confirm() {
    setFormError(null);
    try {
      const result = await signOut.mutateAsync({ key: newIdempotencyKey() });
      setEnded(result.ended);
      setOpen(false);
    } catch (error) {
      setFormError(toApiError(error).message);
    }
  }

  const devices = `${others} other device${others === 1 ? "" : "s"}`;
  return (
    <>
      {others > 0 && (
        <Button
          variant="link"
          onClick={() => {
            setFormError(null);
            setOpen(true);
          }}
        >
          Sign out everywhere else
        </Button>
      )}
      <span role="status" className="text-body text-ink-secondary sm:text-right">
        {ended !== null ? `Signed out ${ended} other device${ended === 1 ? "" : "s"}.` : ""}
      </span>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={`Sign out ${devices}?`}
        description="They need your password and a code to sign in again. This device stays signed in."
      >
        <div className="flex flex-col gap-6">
          <FormError message={formError} />
          <div className="flex items-center gap-6">
            <Button
              size="lg"
              pending={signOut.isPending}
              pendingLabel="Signing out…"
              onClick={() => void confirm()}
            >
              Sign out other devices
            </Button>
            <Button variant="link" onClick={() => setOpen(false)}>
              Keep them signed in
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function AccountSkeleton() {
  return (
    <SkeletonGroup label="Loading your account">
      <div className="flex max-w-4xl flex-col gap-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-80" />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </SkeletonGroup>
  );
}
