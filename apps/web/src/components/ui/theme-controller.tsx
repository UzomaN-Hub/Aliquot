"use client";

import { useEffect } from "react";

import { applyTheme, msUntilNextSwitch } from "@/lib/theme/theme";
import { useThemeStore } from "@/stores/theme";

/**
 * Mounted once in the root layout. Loads the saved preference and, in Auto,
 * switches exactly at 08:00 and 19:00 while the page stays open.
 */
export function ThemeController() {
  const preference = useThemeStore((state) => state.preference);
  const hydrate = useThemeStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (preference !== "auto") return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        applyTheme("auto");
        schedule();
      }, msUntilNextSwitch() + 1000);
    };
    schedule();
    // A laptop waking from sleep may have skipped the timer: re-check on return.
    const onVisible = () => {
      if (document.visibilityState === "visible") applyTheme("auto");
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [preference]);

  return null;
}
