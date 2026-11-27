"use client";

import { useEffect } from "react";

import { MOTION_EVENT } from "@/lib/motion/motion";

/**
 * Starts the landing page's scroll animations after the page is on screen.
 * The animation code (GSAP, ScrollTrigger, SplitText, Lenis) is a separate chunk,
 * loaded only here, so it never delays the first paint and never ships to the lab
 * app or the console. "Pause motion" stops everything and leaves the content visible.
 */
export function LandingMotion() {
  useEffect(() => {
    let stop: (() => void) | undefined;
    let generation = 0;

    const apply = async () => {
      const mine = ++generation;
      stop?.();
      stop = undefined;
      if (!document.documentElement.classList.contains("motion-on")) return;
      const { startMotion } = await import("./start-motion");
      if (mine !== generation) return; // a newer toggle won
      stop = startMotion();
    };

    void apply();
    window.addEventListener(MOTION_EVENT, apply);
    return () => {
      generation++;
      window.removeEventListener(MOTION_EVENT, apply);
      stop?.();
      // Leaving the landing page: the rest of the site restores scroll normally.
      history.scrollRestoration = "auto";
    };
  }, []);

  return null;
}
