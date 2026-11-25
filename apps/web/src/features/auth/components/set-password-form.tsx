"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { PasswordInput } from "@/components/ui/password-input";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { toApiError } from "@/lib/api/client";

import { checkLink, setPassword, type LinkInfo } from "../api";
import { setPasswordSchema, type SetPasswordValues } from "../schemas";

// The token arrives in the URL #fragment, which browsers never send to a server
// (decision 015). It's read here, in the page, and posted in a request body.
function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}
const readHash = () => window.location.hash;
const noHash = () => "";

function tokenFrom(hash: string): string | null {
  return new URLSearchParams(hash.replace(/^#/, "")).get("token");
}

type State =
  | { kind: "checking" }
  | { kind: "ready"; info: LinkInfo }
  | { kind: "invalid"; message: string }
  | { kind: "done"; info: LinkInfo };

/** Set password from an invite or reset link (PAGES.md 8, FLOWS.md §10). */
export function SetPasswordForm({ lab }: { lab: string }) {
  const hash = useSyncExternalStore(subscribe, readHash, noHash);
  const token = tokenFrom(hash);
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
          You&apos;re all set, {state.info.full_name.split(" ")[0]}.
        </h1>
        <p className="text-body-lg text-ink-secondary">
          Sign in with {state.info.email} and your new password.
        </p>
        <Button asChild size="lg" className="mt-4 w-full">
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
        // The link is spent: take it out of the address bar and history.
        window.history.replaceState(null, "", window.location.pathname);
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
      <h1 className="text-figure font-medium">
        {welcome ? `Welcome, ${info.full_name.split(" ")[0]}.` : "Choose a new password"}
      </h1>
      <p className="mt-2 mb-9 text-body-lg text-ink-secondary">
        {welcome
          ? `Choose a password to finish setting up your ${info.lab_name} account (${info.email}).`
          : `For ${info.email}.`}
      </p>
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <FormError message={formError} />
        {/* Lets password managers save the new password against the right account. */}
        <input type="email" autoComplete="username" value={info.email} readOnly hidden />
        <Field
          label="New password"
          hint="At least 12 characters. A short sentence works well."
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
