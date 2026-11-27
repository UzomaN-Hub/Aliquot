"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/choice";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FormError } from "@/components/ui/form-error";
import { Modal } from "@/components/ui/modal";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { toApiError } from "@/lib/api/client";
import { formatDate } from "@/lib/format/dates";
import { sectionLabels } from "@/lib/format/labels";

import { newIdempotencyKey, useChangeLabStatus, useLab, useUpdateLab } from "../queries";
import {
  editLabSchema,
  reasonSchema,
  type EditLabOutput,
  type EditLabValues,
  type LabDetail as Lab,
  type ReasonValues,
} from "../schemas";
import { timezones } from "./create-lab-form";

/** Lab detail (PAGES.md 4): facts, edit, suspend or reactivate. */
export function LabDetail({ id }: { id: string }) {
  const lab = useLab(id);
  const [editing, setEditing] = useState(false);

  if (lab.isPending) return <DetailSkeleton />;
  if (lab.isError) {
    const missing = toApiError(lab.error).status === 404;
    return (
      <div className="flex flex-col items-start gap-3">
        <h1 className="text-title font-medium">
          {missing ? "This lab doesn't exist." : "We can't load this lab right now."}
        </h1>
        {missing ? (
          <Button variant="link" asChild>
            <Link href="/console">Back to labs</Link>
          </Button>
        ) : (
          <Button variant="link" onClick={() => void lab.refetch()}>
            Try again
          </Button>
        )}
      </div>
    );
  }

  const data = lab.data;
  return (
    <div className="flex max-w-4xl flex-col gap-10">
      <div className="flex flex-col gap-2">
        <Link href="/console" className="text-body text-ink-muted hover:text-ink">
          ← Labs
        </Link>
        <h1 className="text-display font-medium">{data.name}</h1>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body text-ink-secondary">
          {data.status === "active" ? (
            <span>Active since {formatDate(data.created_at)}</span>
          ) : (
            <span className="font-semibold text-eosin-text">
              Suspended{data.suspended_at ? ` on ${formatDate(data.suspended_at)}` : ""}
            </span>
          )}
          <a
            href={`/l/${data.slug}/sign-in`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono underline decoration-ink-faint underline-offset-4 hover:decoration-ink"
          >
            /l/{data.slug}
          </a>
        </p>
      </div>

      {editing ? (
        <EditLab lab={data} onDone={() => setEditing(false)} />
      ) : (
        <>
          <dl className="stagger grid gap-x-10 gap-y-6 [--stagger-start:120ms] sm:grid-cols-2">
            <Fact label="Staff" mono value={String(data.staff_count)} />
            <Fact
              label="Sections"
              value={data.sections.map((section) => sectionLabels[section]).join(", ")}
            />
            <Fact label="Street address" value={data.address} />
            <Fact label="Phone" value={data.phone} />
            <Fact label="Email" value={data.email} />
            <Fact label="Registered name" value={data.legal_name} />
            <Fact label="Timezone" value={data.timezone.replaceAll("_", " ")} />
          </dl>
          <div className="flex flex-wrap items-center gap-8 border-t border-hairline pt-8">
            <Button variant="link" onClick={() => setEditing(true)}>
              Edit details
            </Button>
            <StatusAction lab={data} />
          </div>
        </>
      )}
    </div>
  );
}

function Fact({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1 border-b border-hairline pb-4">
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd className={mono ? "font-mono text-figure" : "text-body-lg"}>
        {value ?? <span className="text-ink-muted">Not set</span>}
      </dd>
    </div>
  );
}

function EditLab({ lab, onDone }: { lab: Lab; onDone: () => void }) {
  const update = useUpdateLab(lab.id);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<EditLabValues, unknown, EditLabOutput>({
    resolver: zodResolver(editLabSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      name: lab.name,
      address: lab.address ?? "",
      phone: lab.phone ?? "",
      email: lab.email ?? "",
      legal_name: lab.legal_name ?? "",
      timezone: lab.timezone,
    },
  });

  async function onSubmit(values: EditLabOutput) {
    setFormError(null);
    const changes = Object.fromEntries(
      Object.entries(values).filter(([field]) => field in dirtyFields),
    ) as Partial<EditLabOutput>;
    if (Object.keys(changes).length === 0) return onDone();
    try {
      await update.mutateAsync({ changes, key: newIdempotencyKey() });
      onDone();
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.field && apiError.field in editLabSchema.shape) {
        setError(apiError.field as keyof EditLabValues, { message: apiError.message });
      } else {
        setFormError(apiError.message);
      }
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
      <FormError message={formError} />
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Name" error={errors.name?.message} className="sm:col-span-2">
          <Input size="lg" {...register("name")} />
        </Field>
        <Field
          label="Street address"
          optional
          error={errors.address?.message}
          className="sm:col-span-2"
        >
          <Input {...register("address")} />
        </Field>
        <Field label="Phone" optional error={errors.phone?.message}>
          <Input type="tel" {...register("phone")} />
        </Field>
        <Field label="Email" optional error={errors.email?.message}>
          <Input type="email" {...register("email")} />
        </Field>
        <Field label="Registered name" optional error={errors.legal_name?.message}>
          <Input {...register("legal_name")} />
        </Field>
        <Field label="Timezone" error={errors.timezone?.message}>
          <Select {...register("timezone")}>
            {timezones().map((zone) => (
              <option key={zone} value={zone}>
                {zone.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex items-center gap-6 border-t border-hairline pt-8">
        <Button type="submit" size="lg" pending={isSubmitting} pendingLabel="Saving…">
          Save changes
        </Button>
        <Button variant="link" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/** Suspend or reactivate: a consequence, a reason for the audit log, a verb button. */
function StatusAction({ lab }: { lab: Lab }) {
  const [open, setOpen] = useState(false);
  const change = useChangeLabStatus(lab.id);
  const [formError, setFormError] = useState<string | null>(null);
  const suspend = lab.status === "active";
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReasonValues>({
    resolver: zodResolver(reasonSchema),
    mode: "onSubmit",
    defaultValues: { reason: "" },
  });

  async function onSubmit({ reason }: ReasonValues) {
    setFormError(null);
    try {
      await change.mutateAsync({
        action: suspend ? "suspend" : "reactivate",
        reason,
        key: newIdempotencyKey(),
      });
      setOpen(false);
      reset();
    } catch (error) {
      setFormError(toApiError(error).message);
    }
  }

  return (
    <>
      <Button
        variant="link"
        className={suspend ? "text-eosin-text" : undefined}
        onClick={() => setOpen(true)}
      >
        {suspend ? "Suspend lab" : "Reactivate lab"}
      </Button>
      <Modal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            reset();
            setFormError(null);
          }
        }}
        title={suspend ? `Suspend ${lab.name}?` : `Reactivate ${lab.name}?`}
        description={
          suspend
            ? "Staff won't be able to sign in and patient links will show “unavailable”. Nothing is deleted; you can reactivate at any time."
            : "Staff can sign in again and patient links work again. Everything is as it was."
        }
      >
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <FormError message={formError} />
          <Field label="Reason" hint="Kept in the audit log." error={errors.reason?.message}>
            <Textarea rows={3} {...register("reason")} />
          </Field>
          <div className="flex items-center gap-6">
            <Button
              type="submit"
              size="lg"
              pending={isSubmitting}
              pendingLabel={suspend ? "Suspending…" : "Reactivating…"}
            >
              {suspend ? "Suspend lab" : "Reactivate lab"}
            </Button>
            <Button variant="link" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function DetailSkeleton() {
  return (
    <SkeletonGroup label="Loading lab">
      <div className="flex max-w-4xl flex-col gap-8">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-5 w-56" />
        <div className="grid gap-6 sm:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </SkeletonGroup>
  );
}
