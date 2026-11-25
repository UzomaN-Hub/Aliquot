"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import type { CreateLabResult } from "../schemas";

/**
 * After "Create lab": the one moment the invite link exists in readable form.
 * Copying it is the primary action. Email delivery arrives with the outbox stage.
 */
export function InviteResult({ result }: { result: CreateLabResult }) {
  const [copied, setCopied] = useState(false);
  const { lab, invite_url: url } = result;

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-2 text-body text-ink-secondary">
          <span aria-hidden="true">✓</span> Lab created
        </p>
        <h1 className="text-display font-medium">{lab.name} is ready.</h1>
        <p className="font-mono text-body text-ink-secondary">/l/{lab.slug}</p>
      </div>

      {url ? (
        <section className="flex flex-col gap-4 rounded-panel border border-hairline bg-surface-raised p-6">
          <h2 className="text-title font-medium">Invite link for the first Manager</h2>
          <p className="text-body-lg text-ink-secondary">
            Send it to them yourself. It works once, expires in 72 hours, and is shown only now.
          </p>
          <p
            className="rounded-control border border-hairline bg-surface px-3 py-2.5 font-mono text-body break-all select-all"
            aria-label="Invite link"
          >
            {url}
          </p>
          <div className="flex items-center gap-4">
            <Button size="lg" onClick={() => void copy()}>
              {copied ? "Copied" : "Copy link"}
            </Button>
            <span role="status" className="text-body text-ink-secondary">
              {copied ? "The link is on your clipboard." : ""}
            </span>
          </div>
        </section>
      ) : (
        <p className="text-body-lg text-ink-secondary">
          This lab was created by an earlier attempt, and its invite link was shown then. A new link
          can be issued from the lab&apos;s page once re-sending is available.
        </p>
      )}

      <div className="flex gap-6">
        <Button variant="link" asChild>
          <Link href={`/console/labs/${lab.id}`}>View lab</Link>
        </Button>
        <Button variant="link" asChild>
          <Link href="/console">Back to labs</Link>
        </Button>
      </div>
    </div>
  );
}
