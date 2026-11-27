"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { AuthLead, AuthTitle } from "@/components/patterns/auth-frame";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { PasswordInput } from "@/components/ui/password-input";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { toApiError } from "@/lib/api/client";
import { forgetLink, useLinkToken } from "@/lib/links/use-link-token";

import { checkLink, setPassword, type LinkInfo } from "../api";
import { setPasswordSchema, type SetPasswordValues } from "../schemas";

type State =
  | { kind: "checking" }
  | { kind: "ready"; info: LinkInfo }
  | { kind: "invalid"; message: string }
  | { kind: "done"; info: LinkInfo };

/** Set password from an invite or reset link (PAGES.md 8, FLOWS.md §10). */
export function SetPasswordForm({ lab }: { lab: string }) {
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
    checkLink(lab, token)
      .then((info) => !cancelled && setState({ kind: "ready", info }))
      .catch(
        (error: unknown) =>
          !cancelled && setState({ kind: "invalid", message: toApiError(error).message }),
      );
    return () => {
      cancelled = true;
    };
  }, [lab, token, state.kind]);

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
        <AuthTitle lead="You're all set," accent={state.info.full_name.split(" ")[0] ?? ""} />
        <p className="mt-4 animate-rise text-body-lg text-ink-secondary [animation-delay:250ms]">
          Sign in with {state.info.email} and your new password.
        </p>
        <Button asChild size="xl" className="mt-10">
          <Link href={`/l/${lab}/sign-in`}>Go to sign-in</Link>
        </Button>
      </div>
    );
  }
  return (
    <ChoosePassword
      lab={lab}
      token={token ?? ""}
      info={state.info}
      onDone={() => {
        forgetLink();
        setState({ kind: "done", info: state.info });
      }}
    />
  );
}

function ChoosePassword({
  lab,
  token,
  info,
  onDone,
}: {
  lab: string;
  token: string;
  info: LinkInfo;
  onDone: () => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordValues>({
    resolver: zodResolver(setPasswordSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: { password: "", confirm: "" },
  });

  async function onSubmit(values: SetPasswordValues) {
    setFormError(null);
    try {
      await setPassword(lab, token, values.password);
      onDone();
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.field === "password") setError("password", { message: apiError.message });
      else setFormError(apiError.message);
    }
  }

  const welcome = info.purpose === "invite";
  return (
    <>
      {welcome ? (
        <AuthTitle lead="Welcome," accent={info.full_name.split(" ")[0] ?? ""} />
      ) : (
        <AuthTitle lead="Choose a new" accent="password" />
      )}
      <AuthLead>
        {welcome
          ? `Choose a password to finish setting up your ${info.lab_name} account (${info.email}).`
          : `For ${info.email}.`}
      </AuthLead>
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="stagger flex flex-col gap-7 [--stagger-start:320ms]"
      >
        <FormError message={formError} />
        {/* Lets password managers save the new password against the right account. */}
        <input type="email" autoComplete="username" value={info.email} readOnly hidden />
        <Field
          look="line"
          index={1}
          label="New password"
          hint="At least 12 characters. A short sentence works well."
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
