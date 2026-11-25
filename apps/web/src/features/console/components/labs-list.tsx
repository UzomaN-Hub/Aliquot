"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormError } from "@/components/ui/form-error";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format/dates";

import { useLabs } from "../queries";

/**
 * Labs (PAGES.md 2). The figure leads ("3 labs"), the table follows: square rows on
 * hairlines, never a card per lab. Tenant-level facts only (ROLES.md).
 */
export function LabsList() {
  const labs = useLabs();

  const suspended = labs.data?.filter((lab) => lab.status === "suspended").length ?? 0;
  const count = labs.data?.length ?? 0;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-1">
          <p className="text-body text-ink-muted">Labs on the platform</p>
          <h1 className="text-display font-medium">
            {labs.isSuccess ? `${count} ${count === 1 ? "lab" : "labs"}` : "Labs"}
          </h1>
          {suspended > 0 && <p className="text-body text-ink-secondary">{suspended} suspended</p>}
        </div>
        <Button asChild>
          <Link href="/console/labs/new">Create a lab</Link>
        </Button>
      </div>

      {labs.isPending && <LabsSkeleton />}
      {labs.isError && (
        <div className="flex flex-col items-start gap-3">
          <FormError message={labs.error.message} />
          <Button variant="link" onClick={() => void labs.refetch()}>
            Try again
          </Button>
        </div>
      )}
      {labs.isSuccess && count === 0 && (
        <EmptyState
          message="No labs yet. Each lab you create gets its own address, staff and data."
          action={
            <Button variant="link" asChild>
              <Link href="/console/labs/new">Create the first lab</Link>
            </Button>
          }
        />
      )}
      {labs.isSuccess && count > 0 && (
        <table className="w-full border-collapse text-left text-body">
          <thead>
            <tr className="border-b border-hairline text-caption text-ink-muted">
              <th scope="col" className="py-3 pr-6 font-normal">
                Lab
              </th>
              <th scope="col" className="py-3 pr-6 font-normal">
                Address
              </th>
              <th scope="col" className="py-3 pr-6 font-normal">
                Status
              </th>
              <th scope="col" className="py-3 pr-6 text-right font-normal">
                Staff
              </th>
              <th scope="col" className="py-3 text-right font-normal">
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {labs.data.map((lab) => (
              <tr
                key={lab.id}
                className="h-12 border-b border-hairline transition-colors hover:bg-hover"
              >
                <td className="pr-6">
                  <Link
                    href={`/console/labs/${lab.id}`}
                    className="font-medium underline decoration-transparent underline-offset-4 hover:decoration-ink-faint"
                  >
                    {lab.name}
                  </Link>
                </td>
                <td className="pr-6 font-mono text-ink-secondary">/l/{lab.slug}</td>
                <td className="pr-6">
                  {lab.status === "active" ? (
                    <span>Active</span>
                  ) : (
                    <span className="font-semibold text-eosin-text">Suspended</span>
                  )}
                </td>
                <td className="pr-6 text-right font-mono">{lab.staff_count}</td>
                <td className="text-right text-ink-secondary">{formatDate(lab.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function LabsSkeleton() {
  return (
    <SkeletonGroup label="Loading labs">
      <div className="flex flex-col">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex h-12 items-center gap-6 border-b border-hairline">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </SkeletonGroup>
  );
}
