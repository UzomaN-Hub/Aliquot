"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AuthLead, AuthTitle } from "@/components/patterns/auth-frame";
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
        <div className="flex flex-col gap-8">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-15 w-full" />
        </div>
      </SkeletonGroup>
    );
  }
  if (state.kind === "invalid") {
    return (
      <>
        <AuthTitle lead="This link" accent="can't be used" />
        <p className="mt-4 animate-rise text-body-lg text-ink-secondary [animation-delay:250ms]">
          {state.message}
        </p>
      </>
    );
  }
  if (state.kind === "done") {
    return (
      <div className="flex flex-col">
        <p className="mb-5 flex animate-pop items-center gap-2 font-mono text-caption tracking-label text-ink-secondary uppercase">
          <span aria-hidden="true" className="text-primary">
            ✓
          </span>{" "}
          Password set
        </p>
        <AuthTitle lead="One more step," accent={firstName(state.who.full_name)} />
        <p className="mt-4 animate-rise text-body-lg text-ink-secondary [animation-delay:250ms]">
          Sign in with {state.who.email}. You&apos;ll then scan a QR code with an authenticator app,
          so every sign-in also needs your phone.
        </p>
        <Button asChild size="xl" className="mt-10">
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
      <AuthTitle lead="Welcome," accent={firstName(who.full_name)} />
      <AuthLead>
        You&apos;ve been invited to run {platformName} as a super-admin ({who.email}). Choose a
        password to begin.
      </AuthLead>
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="stagger flex flex-col gap-7 [--stagger-start:320ms]"
      >
        <FormError message={formError} />
        {/* Lets password managers save the new password against the right account. */}
        <input type="email" autoComplete="username" value={who.email} readOnly hidden />
        <Field
          look="line"
          index={1}
          label="New password"
          hint={`At least ${CONSOLE_MIN_PASSWORD} characters. A short sentence works well.`}
          error={errors.password?.message}
        >
          <PasswordInput size="lg" autoComplete="new-password" {...register("password")} />
        </Field>
        <Field look="line" index={2} label="Type it again" error={errors.confirm?.message}>
          <PasswordInput size="lg" autoComplete="new-password" {...register("confirm")} />
        </Field>
        <div className="pt-2">
          <Button type="submit" size="xl" pending={isSubmitting} pendingLabel="Saving…">
            Set password
          </Button>
        </div>
      </form>
    </>
  );
}
