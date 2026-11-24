"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

/** Click to watch the pending state: same width, "Saving…", repeat clicks ignored. */
export function PendingDemo() {
  const [pending, setPending] = useState(false);

  return (
    <Button
      pending={pending}
      pendingLabel="Saving…"
      onClick={() => {
        setPending(true);
        setTimeout(() => setPending(false), 2000);
      }}
    >
      Save result
    </Button>
  );
}
