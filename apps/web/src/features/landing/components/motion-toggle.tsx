"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { MOTION_EVENT, setMotionPaused } from "@/lib/motion/motion";

/** "Pause motion" (WCAG 2.2.2): stops every animation on the page, remembered. */
export function MotionToggle() {
  const [running, setRunning] = useState<boolean | null>(null);

  useEffect(() => {
    const sync = () => setRunning(document.documentElement.classList.contains("motion-on"));
    sync();
    window.addEventListener(MOTION_EVENT, sync);
    return () => window.removeEventListener(MOTION_EVENT, sync);
  }, []);

  if (running === null) return null; // decided in the browser only
  return (
    <Button variant="link" onClick={() => setMotionPaused(running)} aria-pressed={!running}>
      {running ? "Pause motion" : "Play motion"}
    </Button>
  );
}
