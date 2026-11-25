"use client";

import { Button } from "@/components/ui/button";

/** The API couldn't be reached while loading a lab's public page. */
export default function AuthError({ retry }: { error: Error; retry: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6">
      <h1 className="text-title font-medium">We can&apos;t load this page right now.</h1>
      <p className="text-body-lg text-ink-secondary">
        The service may be starting up or your connection dropped. Try again in a moment.
      </p>
      <div>
        <Button size="lg" onClick={() => retry()}>
          Try again
        </Button>
      </div>
    </main>
  );
}
