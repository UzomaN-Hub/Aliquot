"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { AuthNote, SoonLink } from "@/components/patterns/auth-frame";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { PasswordInput } from "@/components/ui/password-input";
import { toApiError } from "@/lib/api/client";
import { useSessionStore } from "@/stores/session";

import { signIn } from "../api";
import { signInSchema, type SignInValues } from "../schemas";

/**
 * Staff sign-in (FLOWS.md §10). Errors show on blur or submit, never while typing.
 * Wrong credentials: one message for every cause, the password is cleared and
 * focused, the email stays.
 */
export function SignInForm({ lab }: { lab: string }) {
  const router = useRouter();
  const setSession = useSessionStore((state) => state.setSession);
  const [formError, setFormError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: SignInValues) {
    setFormError(null);
    try {
      const session = await signIn(lab, values);
      setSession(session);
      setRedirecting(true); // keep "Signing in…" until the next page takes over
      router.replace(`/l/${lab}`);
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.field === "email" || apiError.field === "password") {
        setError(apiError.field, { message: apiError.message });
        setFocus(apiError.field);
        return;
      }
      setFormError(apiError.message);
      if (apiError.code === "invalid_credentials") {
        resetField("password");
        setFocus("password");
      }
    }
  }

  return (
    <>
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
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Your work email"
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
          <Button
            type="submit"
            size="xl"
            pending={isSubmitting || redirecting}
            pendingLabel="Signing in…"
          >
            Sign in
          </Button>
        </div>
      </form>
      <AuthNote note="Resetting by email arrives soon.">
        <SoonLink
          strong
          soon="Password reset"
          text="Resetting your password by email arrives very soon. Until then, ask your lab manager for help."
        >
          Forgot your password?
        </SoonLink>
      </AuthNote>
    </>
  );
}
