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

import { startSignIn, verifyCode, verifyRecoveryCode } from "../api";
import {
  codeSchema,
  consoleSignInSchema,
  recoveryCodeSchema,
  type CodeValues,
  type ConsoleSignInValues,
  type RecoveryCodeOutput,
  type RecoveryCodeValues,
  type SignInStep,
} from "../schemas";

/**
 * Super-admin sign-in (decision 015): password, then a 6-digit code. The first
 * time, the second step sets up the authenticator app with a QR code. Without the
 * phone, a single-use recovery code stands in for the code (decision 023).
 */
export function ConsoleSignIn() {
  const [step, setStep] = useState<SignInStep | null>(null);
  const [recovering, setRecovering] = useState(false);
  const restart = () => {
    setStep(null);
    setRecovering(false);
  };
  if (!step) return <PasswordStep onNext={setStep} />;
  if (recovering) {
    return (
      <RecoveryStep
        challenge={step.challenge}
        onRestart={restart}
        onBack={() => setRecovering(false)}
      />
    );
  }
  return <CodeStep step={step} onRestart={restart} onRecover={() => setRecovering(true)} />;
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

function CodeStep({
  step,
  onRestart,
  onRecover,
}: {
  step: SignInStep;
  onRestart: () => void;
  onRecover: () => void;
}) {
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
          {/* Recovery codes exist only once 2FA is on, so not while setting it up. */}
          {!setup && (
            <Button variant="link" onClick={onRecover}>
              Use a recovery code instead
            </Button>
          )}
          <Button variant="link" onClick={onRestart}>
            Use a different account
          </Button>
        </div>
      </form>
    </>
  );
}

function RecoveryStep({
  challenge,
  onRestart,
  onBack,
}: {
  challenge: string;
  onRestart: () => void;
  onBack: () => void;
}) {
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
  } = useForm<RecoveryCodeValues, unknown, RecoveryCodeOutput>({
    resolver: zodResolver(recoveryCodeSchema),
    mode: "onSubmit",
    defaultValues: { recovery_code: "" },
  });

  async function onSubmit(values: RecoveryCodeOutput) {
    setFormError(null);
    try {
      setSession(await verifyRecoveryCode(challenge, values.recovery_code));
      setRedirecting(true);
      // Straight to My account: the phone may be gone, and that's where it's fixed.
      router.replace("/console/account");
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.code === "challenge_expired") {
        onRestart();
        return;
      }
      setFormError(apiError.message);
      resetField("recovery_code");
      setFocus("recovery_code");
    }
  }

  return (
    <>
      <AuthTitle lead="Use a" accent="recovery code" />
      <AuthLead>
        Enter one of the recovery codes you saved. Each works once; you&apos;ll go to My account
        next, to move two-step sign-in to a new phone if you need to.
      </AuthLead>
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="stagger flex flex-col gap-7 [--stagger-start:320ms]"
      >
        <FormError message={formError} />
        <Field look="line" label="Recovery code" error={errors.recovery_code?.message}>
          <Input
            size="lg"
            mono
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={24}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            className="tracking-[0.12em] uppercase placeholder:normal-case"
            {...register("recovery_code")}
          />
        </Field>
        <div className="flex flex-col items-center gap-3 pt-2">
          <Button
            type="submit"
            size="xl"
            pending={isSubmitting || redirecting}
            pendingLabel="Checking…"
          >
            Sign in
          </Button>
          <Button variant="link" onClick={onBack}>
            Use my authenticator app instead
          </Button>
        </div>
      </form>
    </>
  );
}
