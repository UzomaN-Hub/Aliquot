"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox, Select } from "@/components/ui/choice";
import { Field, Input } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { toApiError } from "@/lib/api/client";
import { sectionLabels } from "@/lib/format/labels";

import { newIdempotencyKey, useCreateLab } from "../queries";
import {
  createLabSchema,
  suggestSlug,
  type CreateLabOutput,
  type CreateLabResult,
  type CreateLabValues,
} from "../schemas";
import { InviteResult } from "./invite-result";

const SECTIONS = ["chem_path", "haematology", "microbiology"] as const;

export function timezones(): string[] {
  const all =
    typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  return all.length > 0 ? all : ["Africa/Lagos", "UTC"];
}

/**
 * Create a lab (PAGES.md 3, FLOWS.md §1): the lab, its sections and its first Manager,
 * in one step. The address is suggested from the name until the person edits it.
 */
export function CreateLabForm() {
  const createLab = useCreateLab();
  const [result, setResult] = useState<CreateLabResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    setFocus,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateLabValues, unknown, CreateLabOutput>({
    resolver: zodResolver(createLabSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      name: "",
      slug: "",
      address: "",
      phone: "",
      email: "",
      legal_name: "",
      timezone: "Africa/Lagos",
      sections: [...SECTIONS],
      manager_name: "",
      manager_email: "",
    },
  });
  const slug = useWatch({ control, name: "slug" });
  const nameField = register("name");

  async function onSubmit(values: CreateLabOutput) {
    setFormError(null);
    try {
      setResult(await createLab.mutateAsync({ values, key: newIdempotencyKey() }));
    } catch (error) {
      const apiError = toApiError(error);
      const field = apiError.field === "manager" ? "manager_email" : apiError.field;
      if (field && field in createLabSchema.shape) {
        setError(field as keyof CreateLabValues, { message: apiError.message });
        setFocus(field as keyof CreateLabValues);
      } else {
        setFormError(apiError.message);
      }
    }
  }

  if (result) return <InviteResult result={result} />;

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <div className="flex flex-col gap-1">
        <Link href="/console" className="text-body text-ink-muted hover:text-ink">
          ← Labs
        </Link>
        <h1 className="text-display font-medium">Create a lab</h1>
        <p className="text-body-lg text-ink-secondary">
          The lab gets its own address, staff and data. Its first Manager receives an invite to set
          a password.
        </p>
      </div>

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-12">
        <FormError message={formError} />

        <fieldset className="grid gap-6 sm:grid-cols-2">
          <legend className="mb-4 text-title font-medium">The lab</legend>
          <Field label="Name" error={errors.name?.message} className="sm:col-span-2">
            <Input
              size="lg"
              autoComplete="organization"
              {...nameField}
              onChange={(event) => {
                void nameField.onChange(event);
                if (!slugEdited) setValue("slug", suggestSlug(event.target.value));
              }}
            />
          </Field>
          <Field
            label="Address on the platform"
            hint={`Staff sign in at /l/${slug || "…"}/sign-in. It can't change later.`}
            error={errors.slug?.message}
            className="sm:col-span-2"
          >
            <Input
              mono
              autoCapitalize="none"
              spellCheck={false}
              {...register("slug", { onChange: () => setSlugEdited(true) })}
            />
          </Field>
          <Field
            label="Street address"
            optional
            error={errors.address?.message}
            className="sm:col-span-2"
          >
            <Input autoComplete="street-address" {...register("address")} />
          </Field>
          <Field label="Phone" optional error={errors.phone?.message}>
            <Input type="tel" autoComplete="tel" {...register("phone")} />
          </Field>
          <Field label="Email" optional error={errors.email?.message}>
            <Input type="email" autoComplete="email" {...register("email")} />
          </Field>
          <Field
            label="Registered name"
            optional
            hint="If it differs from the name above."
            error={errors.legal_name?.message}
          >
            <Input {...register("legal_name")} />
          </Field>
          <Field
            label="Timezone"
            hint="Times on results and reports use it."
            error={errors.timezone?.message}
          >
            <Select {...register("timezone")}>
              {timezones().map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </Field>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-title font-medium">Sections</legend>
          <p className="mb-2 text-body text-ink-secondary">
            The lab can switch these on or off later.
          </p>
          {SECTIONS.map((section) => (
            <Checkbox
              key={section}
              value={section}
              label={sectionLabels[section]}
              {...register("sections")}
            />
          ))}
          {errors.sections?.message && (
            <p className="flex gap-1.5 text-body text-eosin-text">
              <span aria-hidden="true" className="font-semibold">
                !
              </span>
              {errors.sections.message}
            </p>
          )}
        </fieldset>

        <fieldset className="grid gap-6 sm:grid-cols-2">
          <legend className="mb-4 text-title font-medium">First Manager</legend>
          <Field label="Full name" error={errors.manager_name?.message}>
            <Input autoComplete="off" {...register("manager_name")} />
          </Field>
          <Field
            label="Email"
            hint="The invite link is for this person only."
            error={errors.manager_email?.message}
          >
            <Input
              type="email"
              autoComplete="off"
              autoCapitalize="none"
              {...register("manager_email")}
            />
          </Field>
        </fieldset>

        <div className="flex flex-wrap items-center gap-6 border-t border-hairline pt-8">
          <Button type="submit" size="lg" pending={isSubmitting} pendingLabel="Creating lab…">
            Create lab
          </Button>
          <Button variant="link" asChild>
            <Link href="/console">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
