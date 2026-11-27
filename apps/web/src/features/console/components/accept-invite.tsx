"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { PasswordInput } from "@/components/ui/password-input";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { toApiError } from "@/lib/api/client";
import { firstName } from "@/lib/format/labels";
import { forgetLink, useLinkToken } from "@/lib/links/use-link-token";

import { acceptConsoleInvite, checkConsoleInvite } from "../api";
import { CONSOLE_MIN_PASSWORD } from "../schemas";

type Invitee = { full_name: string; email: string };
type State =
  | { kind: "checking" }
  | { kind: "ready"; who: Invitee }
  | { kind: "invalid"; message: string }
  | { kind: "done"; who: Invitee };

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(
        CONSOLE_MIN_PASSWORD,
        `Use at least ${CONSOLE_MIN_PASSWORD} characters. A short sentence works well.`,
      ),
    confirm: z.string().min(1, "Type the password again."),
  })
  .refine((values) => values.password === values.confirm, {
    path: ["confirm"],
    message: "The two passwords don't match.",
  });
type PasswordValues = z.infer<typeof passwordSchema>;

/** A new super-admin chooses their password; 2FA comes at their first sign-in. */
export function AcceptInvite({ platformName }: { platformName: string }) {
  const token = useLinkToken();
  const [state, setState] = useState<State>({ kind: "checking" });

  useEffect(() => {
    if (state.kind === "done") return;
    if (!token) {
      // Wait one tick: on the server and first paint the hash reads as empty.
      const timer = setTimeout(
        () =>
          setState({
            kind: "invalid",
            message: "This link is incomplete. Open it again from the message you received.",
          }),
        50,
      );
      return () => clearTimeout(timer);
    }
    let cancelled = false;
    checkConsoleInvite(token)
      .then((who) => !cancelled && setState({ kind: "ready", who }))
      .catch(
        (error: unknown) =>
          !cancelled && setState({ kind: "invalid", message: toApiError(error).message }),
      );
    return () => {
      cancelled = true;
    };
  }, [token, state.kind]);

  if (state.kind === "checking") {
    return (
      <SkeletonGroup label="Checking your link">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </SkeletonGroup>
    );
  }
  if (state.kind === "invalid") {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-title font-medium">This link can&apos;t be used.</h1>
        <p className="text-body-lg text-ink-secondary">{state.message}</p>
      </div>
    );
  }
  if (state.kind === "done") {
    return (
      <div className="flex flex-col gap-4">
        <p className="flex items-center gap-2 text-body text-ink-secondary">
          <span aria-hidden="true">✓</span> Password set
        </p>
        <h1 className="text-figure font-medium">
          One more step, {firstName(state.who.full_name)}.
        </h1>
        <p className="text-body-lg text-ink-secondary">
          Sign in with {state.who.email}. You&apos;ll then scan a QR code with an authenticator app,
          so every sign-in also needs your phone.
        </p>
        <Button asChild size="lg" className="mt-4 w-full">
          <Link href="/console/sign-in">Go to sign-in</Link>
        </Button>
      </div>
    );
  }
  return (
    <ChoosePassword
      token={token ?? ""}
      who={state.who}
      platformName={platformName}
      onDone={() => {
        forgetLink();
        setState({ kind: "done", who: state.who });
      }}
    />
  );
}

function ChoosePassword({
  token,
  who,
  platformName,
  onDone,
}: {
  token: string;
  who: Invitee;
  platformName: string;
  onDone: () => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: { password: "", confirm: "" },
  });

  async function onSubmit(values: PasswordValues) {
    setFormError(null);
    try {
      await acceptConsoleInvite(token, values.password);
      onDone();
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.field === "password") setError("password", { message: apiError.message });
      else setFormError(apiError.message);
    }
  }

  return (
    <>
      <h1 className="text-figure font-medium">Welcome, {firstName(who.full_name)}.</h1>
      <p className="mt-2 mb-9 text-body-lg text-ink-secondary">
        You&apos;ve been invited to run {platformName} as a super-admin ({who.email}). Choose a
        password to begin.
      </p>
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <FormError message={formError} />
        {/* Lets password managers save the new password against the right account. */}
        <input type="email" autoComplete="username" value={who.email} readOnly hidden />
        <Field
          label="New password"
          hint={`At least ${CONSOLE_MIN_PASSWORD} characters. A short sentence works well.`}
          error={errors.password?.message}
        >
          <PasswordInput size="lg" autoComplete="new-password" {...register("password")} />
        </Field>
        <Field label="Type it again" error={errors.confirm?.message}>
          <PasswordInput size="lg" autoComplete="new-password" {...register("confirm")} />
        </Field>
        <Button
          type="submit"
          size="lg"
          className="mt-3 w-full"
          pending={isSubmitting}
          pendingLabel="Saving…"
        >
          Set password
        </Button>
      </form>
    </>
  );
}
