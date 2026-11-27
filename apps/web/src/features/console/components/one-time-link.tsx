"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * An invite link in the one moment it exists in readable form (it's stored hashed).
 * Copying it is the primary action. Email delivery arrives with the outbox stage.
 */
export function OneTimeLink({ url, label }: { url: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="flex flex-col gap-4">
      <p
        className="rounded-control border border-hairline bg-surface px-3 py-2.5 font-mono text-body break-all select-all"
        aria-label={label}
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
    </div>
  );
}
