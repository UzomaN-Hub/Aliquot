"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, type UseFormSetError } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/choice";
import { Field, Input } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { Modal } from "@/components/ui/modal";
import { PasswordInput } from "@/components/ui/password-input";
import { toApiError } from "@/lib/api/client";
import { useConsoleSession } from "@/stores/console-session";

import {
  newIdempotencyKey,
  useConfirmNewAuthenticator,
  useCreateRecoveryCodes,
  useStartNewAuthenticator,
} from "../queries";
import {
  RECOVERY_CODE_COUNT,
  codeSchema,
  passwordAndCodeSchema,
  passwordSchema,
  type Account,
  type CodeValues,
  type NewAuthenticator,
  type PasswordAndCodeOutput,
  type PasswordAndCodeValues,
  type PasswordValues,
} from "../schemas";

/** Puts an API error on its field when it names one this form has, else above the form. */
function showError<T extends Record<string, unknown>>(
  error: unknown,
  fields: (keyof T & string)[],
  setError: UseFormSetError<T>,
  setFormError: (message: string) => void,
) {
  const apiError = toApiError(error);
  const field = fields.find((name) => name === apiError.field);
  if (field) {
    // RHF's Path<T> can't be narrowed from a runtime string; `field` is one of ours.
    setError(field as Parameters<UseFormSetError<T>>[0], { message: apiError.message });
  } else {
    setFormError(apiError.message);
  }
}

/** The "you signed in with a recovery code" banner ends once the account is fixed. */
function clearRecoveryNotice() {
  const { session, setSession } = useConsoleSession.getState();
  if (session?.recoveryCodesLeft === undefined) return;
  const next = { ...session };
  delete next.recoveryCodesLeft;
  setSession(next);
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

// ── Recovery codes ───────────────────────────────────────────────────────
export function RecoveryCodes({ account }: { account: Account }) {
  const [open, setOpen] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);
  const first = account.recovery_codes_left === 0;

  function onOpenChange(next: boolean) {
    // Shown once: closing by accident would lose them, so wait for "I've saved them".
    if (!next && codes && !saved) return;
    setOpen(next);
    if (!next) {
      setCodes(null);
      setSaved(false);
    }
  }

  return (
    <>
      <Button variant="link" onClick={() => setOpen(true)}>
        {first ? "Make recovery codes" : "Make a new set"}
      </Button>
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        title={codes ? "Save your recovery codes" : "Make recovery codes"}
        description={
          codes
            ? "Each code signs you in once, in place of a code from your phone. They're shown only now. Keep them away from this device: in a password manager, or printed."
            : `${RECOVERY_CODE_COUNT} single-use codes for when your phone is lost or broken.${
                first ? "" : " Your current codes stop working as soon as the new ones are made."
              }`
        }
      >
        {codes ? (
          <CodesView
            codes={codes}
            email={account.email}
            saved={saved}
            onSaved={setSaved}
            onDone={() => onOpenChange(false)}
          />
        ) : (
          <MakeCodesForm
            onMade={(made) => {
              clearRecoveryNotice();
              setCodes(made);
            }}
            onCancel={() => setOpen(false)}
          />
        )}
      </Modal>
    </>
  );
}

function MakeCodesForm({
  onMade,
  onCancel,
}: {
  onMade: (codes: string[]) => void;
  onCancel: () => void;
}) {
  const make = useCreateRecoveryCodes();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<PasswordAndCodeValues, unknown, PasswordAndCodeOutput>({
    resolver: zodResolver(passwordAndCodeSchema),
    mode: "onSubmit",
    defaultValues: { password: "", code: "" },
  });

  async function onSubmit(values: PasswordAndCodeOutput) {
    setFormError(null);
    try {
      const result = await make.mutateAsync({ ...values, key: newIdempotencyKey() });
      if (result.codes) onMade(result.codes);
      else setFormError("These codes were already shown once. Make a new set.");
    } catch (error) {
      resetField("code");
      showError(error, ["password", "code"], setError, setFormError);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <FormError message={formError} />
      <Field label="Password" error={errors.password?.message}>
        <PasswordInput autoComplete="current-password" {...register("password")} />
      </Field>
      <Field label="6-digit code" hint="From your authenticator app." error={errors.code?.message}>
        <Input
          mono
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          className="tracking-[0.3em]"
          {...register("code")}
        />
      </Field>
      <div className="flex items-center gap-6">
        <Button type="submit" size="lg" pending={isSubmitting} pendingLabel="Making codes…">
          Make recovery codes
        </Button>
        <Button variant="link" onClick={onCancel}>
          Not now
        </Button>
      </div>
    </form>
  );
}

function CodesView({
  codes,
  email,
  saved,
  onSaved,
  onDone,
}: {
  codes: string[];
  email: string;
  saved: boolean;
  onSaved: (saved: boolean) => void;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const text = codes.join("\n");

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }

  function download() {
    const body = `Console recovery codes for ${email}\nEach works once.\n\n${text}\n`;
    const url = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "console-recovery-codes.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <ol
        aria-label="Recovery codes"
        className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-control border border-hairline bg-surface px-4 py-3 font-mono text-body-lg select-all"
      >
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-6">
        <Button variant="link" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy codes"}
        </Button>
        <Button variant="link" onClick={download}>
          Download as text
        </Button>
        <span role="status" className="text-body text-ink-secondary">
          {copied ? "The codes are on your clipboard." : ""}
        </span>
      </div>
      <Checkbox
        label="I've saved these codes somewhere safe"
        checked={saved}
        onChange={(event) => onSaved(event.target.checked)}
      />
      <div>
        <Button size="lg" disabled={!saved} onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}

// ── A new phone ──────────────────────────────────────────────────────────
export function NewPhone() {
  const [open, setOpen] = useState(false);
  const [setup, setSetup] = useState<NewAuthenticator | null>(null);
  const [expired, setExpired] = useState(false);
  const [ended, setEnded] = useState<number | null>(null);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setSetup(null);
      setExpired(false);
    }
  }

  return (
    <>
      <Button
        variant="link"
        onClick={() => {
          setEnded(null);
          setOpen(true);
        }}
      >
        Move to a new phone
      </Button>
      <span role="status" className="text-body text-ink-secondary sm:text-right">
        {ended !== null
          ? `Moved to your new phone. Codes from the old one no longer work${
              ended ? `, and ${plural(ended, "other device")} signed out.` : "."
            }`
          : ""}
      </span>
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        title="Move two-step sign-in to a new phone"
        description={
          setup
            ? "Scan this with the authenticator app on your new phone, then enter the 6-digit code it shows."
            : "Your old phone keeps working until the new one is confirmed. Other devices are signed out when it is."
        }
      >
        {setup ? (
          <ConfirmPhoneForm
            setup={setup}
            onCancel={() => onOpenChange(false)}
            onExpired={() => {
              setSetup(null);
              setExpired(true);
            }}
            onDone={(count) => {
              clearRecoveryNotice();
              setEnded(count);
              onOpenChange(false);
            }}
          />
        ) : (
          <StartPhoneForm
            expired={expired}
            onNext={setSetup}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </Modal>
    </>
  );
}

function StartPhoneForm({
  expired,
  onNext,
  onCancel,
}: {
  expired: boolean;
  onNext: (setup: NewAuthenticator) => void;
  onCancel: () => void;
}) {
  const start = useStartNewAuthenticator();
  const [formError, setFormError] = useState<string | null>(
    expired ? "Setting up took too long. Start again." : null,
  );
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    mode: "onSubmit",
    defaultValues: { password: "" },
  });

  async function onSubmit(values: PasswordValues) {
    setFormError(null);
    try {
      onNext(await start.mutateAsync(values));
    } catch (error) {
      showError(error, ["password"], setError, setFormError);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <FormError message={formError} />
      <Field label="Password" error={errors.password?.message}>
        <PasswordInput autoComplete="current-password" {...register("password")} />
      </Field>
      <div className="flex items-center gap-6">
        <Button type="submit" size="lg" pending={isSubmitting} pendingLabel="Checking…">
          Show the QR code
        </Button>
        <Button variant="link" onClick={onCancel}>
          Not now
        </Button>
      </div>
    </form>
  );
}

function ConfirmPhoneForm({
  setup,
  onCancel,
  onExpired,
  onDone,
}: {
  setup: NewAuthenticator;
  onCancel: () => void;
  onExpired: () => void;
  onDone: (ended: number) => void;
}) {
  const confirm = useConfirmNewAuthenticator();
  const [formError, setFormError] = useState<string | null>(null);
  // One key for this switch: a retried submit replays instead of switching twice.
  const [key] = useState(newIdempotencyKey);
  const {
    register,
    handleSubmit,
    setError,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<CodeValues, unknown, { code: string }>({
    resolver: zodResolver(codeSchema),
    mode: "onSubmit",
    defaultValues: { code: "" },
  });

  async function onSubmit({ code }: { code: string }) {
    setFormError(null);
    try {
      const result = await confirm.mutateAsync({ challenge: setup.challenge, code, key });
      onDone(result.ended);
    } catch (error) {
      if (toApiError(error).code === "challenge_expired") {
        onExpired();
        return;
      }
      resetField("code");
      showError(error, ["code"], setError, setFormError);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
        {/* Our API's QR as an SVG data URI (checked by the schema); an image, never injected. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- inline data: SVG, nothing for next/image to optimise */}
        <img
          src={setup.setup.qr_image}
          alt="QR code to add the console to your new phone's authenticator app"
          width={168}
          height={168}
          className="rounded-control border border-hairline"
        />
        <div>
          <p className="text-caption text-ink-muted">Can&apos;t scan? Enter this key instead:</p>
          <p
            data-testid="new-totp-key"
            // Wraps only between groups of four, so a group is never split across lines.
            className="font-mono text-body tracking-wide select-all"
          >
            {setup.setup.secret.match(/.{1,4}/g)?.join(" ")}
          </p>
        </div>
      </div>
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <FormError message={formError} />
        <Field label="Code from the new phone" error={errors.code?.message}>
          <Input
            mono
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            className="tracking-[0.3em]"
            {...register("code")}
          />
        </Field>
        <div className="flex items-center gap-6">
          <Button type="submit" size="lg" pending={isSubmitting} pendingLabel="Confirming…">
            Use the new phone
          </Button>
          {/* Nothing has changed yet: leaving keeps the old phone. */}
          <Button variant="link" onClick={onCancel}>
            Keep my old phone
          </Button>
        </div>
      </form>
    </div>
  );
}
