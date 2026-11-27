"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { AuthLead, AuthNote, AuthTitle, SoonLink } from "@/components/patterns/auth-frame";
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
      <AuthTitle lead="Platform" accent="console" />
      <AuthLead>For the people who run the platform.</AuthLead>
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="stagger flex flex-col gap-7 [--stagger-start:320ms]"
      >
        <FormError message={formError} />
        <Field look="line" index={1} label="Email" error={errors.email?.message}>
          <Input
            size="lg"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Your email"
            {...register("email")}
          />
        </Field>
        <Field look="line" index={2} label="Password" error={errors.password?.message}>
          <PasswordInput
            size="lg"
            autoComplete="current-password"
            placeholder="Your password"
            {...register("password")}
          />
        </Field>
        <div className="pt-2">
          <Button type="submit" size="xl" pending={isSubmitting} pendingLabel="Checking…">
            Continue
          </Button>
        </div>
      </form>
      <AuthNote note="Resetting by email arrives soon.">
        <SoonLink
          strong
          soon="Password reset"
          text="Resetting your password by email arrives very soon, and it will still ask for your authenticator code. Until then, another super-admin can help."
        >
          Forgot your password?
        </SoonLink>
      </AuthNote>
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
      {setup ? (
        <AuthTitle lead="Set up" accent="two-step sign-in" />
      ) : (
        <AuthTitle lead="Enter your" accent="code" />
      )}
      <AuthLead>
        {setup
          ? "Scan this with an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password), then enter the 6-digit code it shows."
          : "Open your authenticator app and enter the 6-digit code for the console."}
      </AuthLead>

      {setup && (
        <div className="mb-10 flex animate-rise flex-col items-start gap-5 [animation-delay:320ms] sm:flex-row sm:items-center sm:gap-8">
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
            <p
              data-testid="totp-key"
              className="font-mono text-body tracking-wide break-all select-all"
            >
              {setup.secret.match(/.{1,4}/g)?.join(" ")}
            </p>
          </div>
        </div>
      )}

      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="stagger flex flex-col gap-7 [--stagger-start:400ms]"
      >
        <FormError message={formError} />
        <Field look="line" label="6-digit code" error={errors.code?.message}>
          <Input
            size="lg"
            mono
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            placeholder="000 000"
            className="tracking-[0.3em]"
            {...register("code")}
          />
        </Field>
        <div className="flex flex-col items-center gap-3 pt-2">
          <Button
            type="submit"
            size="xl"
            pending={isSubmitting || redirecting}
            pendingLabel="Verifying…"
          >
            {setup ? "Turn on and sign in" : "Sign in"}
          </Button>
          <Button variant="link" onClick={onRestart}>
            Use a different account
          </Button>
        </div>
      </form>
    </>
  );
}
