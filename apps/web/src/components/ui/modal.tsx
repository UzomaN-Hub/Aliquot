"use client";

import { Dialog } from "radix-ui";
import type { ReactNode } from "react";

/**
 * Modal (DESIGN.md "Feedback & states"): only for irreversible or high-stakes
 * decisions. It names the consequence, asks for a reason when the audit needs one,
 * and its button uses the action's verb ("Suspend lab"), never "OK".
 * Radix traps focus inside, closes on Esc and returns focus to the trigger.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* The page behind blurs, so the decision in front is the only thing in focus. */}
        <Dialog.Overlay
          data-testid="modal-overlay"
          className="fixed inset-0 z-40 animate-fade bg-scrim backdrop-blur-md"
        />
        <Dialog.Content
          data-surface
          // Centred with `translate` (Tailwind 4), so the entrance can use `transform`.
          className="fixed top-1/2 left-1/2 z-50 max-h-[90dvh] w-[min(92vw,500px)] -translate-x-1/2 -translate-y-1/2 animate-pop overflow-y-auto rounded-panel border border-hairline bg-surface-raised p-8 text-ink shadow-overlay"
        >
          <Dialog.Title className="text-title font-medium">{title}</Dialog.Title>
          <Dialog.Description asChild>
            <div className="mt-2 text-body-lg text-ink-secondary">{description}</div>
          </Dialog.Description>
          <div className="mt-6">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const ModalClose = Dialog.Close;
