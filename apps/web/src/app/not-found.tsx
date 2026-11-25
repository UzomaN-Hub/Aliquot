import type { Metadata } from "next";

export const metadata: Metadata = { title: "Page not found" };

/** Unknown page or unknown lab address. Says what to do; no illustration (DESIGN.md). */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 px-6">
      <h1 className="text-title font-medium">Page not found.</h1>
      <p className="text-body-lg text-ink-secondary">
        Check the address. If a link sent you here, ask your lab for the right one.
      </p>
    </main>
  );
}
