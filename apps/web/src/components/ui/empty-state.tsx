import type { ReactNode } from "react";

/**
 * Empty state (DESIGN.md): one sentence on what goes here and the single action that
 * fills it. No illustration, no icon.
 */
export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 border-y border-hairline py-14">
      <p className="text-body-lg text-ink-secondary">{message}</p>
      {action}
    </div>
  );
}
