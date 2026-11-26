"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { PasswordInput } from "@/components/ui/password-input";
import { toApiError } from "@/lib/api/client";
import { useConsoleSession } from "@/stores/console-session";

import { startSignIn, verifyCode } from "../api";
import {
  codeSchema,
  consoleSignInSchema,
  type CodeValues,
  type ConsoleSignInValues,
  type SignInStep,
} from "../schemas";

/**
 * Super-admin sign-in (decision 015): password, then a 6-digit code. The first
 * time, the second step sets up the authenticator app with a QR code.
 */
export function ConsoleSignIn() {
  const [step, setStep] = useState<SignInStep | null>(null);
  return step ? (
    <CodeStep step={step} onRestart={() => setStep(null)} />
  ) : (
    <PasswordStep onNext={setStep} />
  );
}

function PasswordStep({ onNext }: { onNext: (step: SignInStep) => void }) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    resetField,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<ConsoleSignInValues>({
    resolver: zodResolver(consoleSignInSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: ConsoleSignInValues) {
    setFormError(null);
    try {
      onNext(await startSignIn(values));
    } catch (error) {
      const apiError = toApiError(error);
      setFormError(apiError.message);
      if (apiError.code === "invalid_credentials") {
        resetField("password");
        setFocus("password");
      }
    }
  }

  return (
    <>
      <h1 className="text-figure font-medium">Console sign-in</h1>
      <p className="mt-2 mb-9 text-body-lg text-ink-secondary">For platform administrators.</p>
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <FormError message={formError} />
        <Field label="Email" error={errors.email?.message}>
          <Input
            size="lg"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            {...register("email")}
          />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <PasswordInput size="lg" autoComplete="current-password" {...register("password")} />
        </Field>
        <Button
          type="submit"
          size="lg"
          className="mt-3 w-full"
          pending={isSubmitting}
          pendingLabel="Checking…"
        >
          Continue
        </Button>
      </form>
    </>
  );
}

function CodeStep({ step, onRestart }: { step: SignInStep; onRestart: () => void }) {
  const router = useRouter();
  const setSession = useConsoleSession((state) => state.setSession);
  const [formError, setFormError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const {
    register,
    handleSubmit,
    resetField,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    mode: "onSubmit",
    defaultValues: { code: "" },
  });
  const setup = step.step === "setup" ? step.setup : null;

  async function onSubmit(values: CodeValues) {
    setFormError(null);
    try {
      const session = await verifyCode(step.challenge, values.code.replace(/\s/g, ""));
      setSession(session);
      setRedirecting(true);
      router.replace("/console");
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.code === "challenge_expired") {
        onRestart();
        return;
      }
      setFormError(apiError.message);
      resetField("code");
      setFocus("code");
    }
  }

  return (
    <>
      <h1 className="text-figure font-medium">
        {setup ? "Set up two-step sign-in" : "Enter your code"}
      </h1>
      <p className="mt-2 mb-8 text-body-lg text-ink-secondary">
        {setup
          ? "Scan this with an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password), then enter the 6-digit code it shows."
          : "Open your authenticator app and enter the 6-digit code for the console."}
      </p>

      {setup && (
        <div className="mb-8 flex flex-col items-start gap-4">
          {/* Our API's QR as an SVG data URI (checked by the schema); an image, never injected. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- inline data: SVG, nothing for next/image to optimise */}
          <img
            src={setup.qr_image}
            alt="QR code to add the console to your authenticator app"
            width={196}
            height={196}
            className="rounded-control border border-hairline"
          />
          <div>
            <p className="text-caption text-ink-muted">Can&apos;t scan? Enter this key instead:</p>
            <p className="font-mono text-body tracking-wide break-all select-all">
              {setup.secret.match(/.{1,4}/g)?.join(" ")}
            </p>
          </div>
        </div>
      )}

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <FormError message={formError} />
        <Field label="6-digit code" error={errors.code?.message}>
          <Input
            size="lg"
            mono
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            className="tracking-[0.3em]"
            {...register("code")}
          />
        </Field>
        <Button
          type="submit"
          size="lg"
          className="mt-3 w-full"
          pending={isSubmitting || redirecting}
          pendingLabel="Verifying…"
        >
          {setup ? "Turn on and sign in" : "Sign in"}
        </Button>
        <Button variant="link" className="self-center" onClick={onRestart}>
          Use a different account
        </Button>
      </form>
    </>
  );
}
