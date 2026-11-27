"use client";

import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type Soon = { title: string; text: string };

/**
 * Anything not built yet says so instead of doing nothing. Any element on the page
 * with `data-soon="Pricing"` (and optionally `data-soon-text`) opens this dialog,
 * over a blurred page. One listener for the whole page (event delegation).
 */
export function ComingSoon({ children }: { children: ReactNode }) {
  const [soon, setSoon] = useState<Soon | null>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = (event.target as Element | null)?.closest<HTMLElement>("[data-soon]");
      if (!target) return;
      event.preventDefault();
      setSoon({
        title: target.dataset.soon ?? "This",
        text:
          target.dataset.soonText ??
          "We're building it now. It will be here soon, without changing anything you already use.",
      });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <>
      {children}
      <Modal
        open={soon !== null}
        onOpenChange={(open) => !open && setSoon(null)}
        title={soon ? `${soon.title}: coming soon` : ""}
        description={soon?.text}
      >
        <Button size="lg" onClick={() => setSoon(null)}>
          Got it
        </Button>
      </Modal>
    </>
  );
}
