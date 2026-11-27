"use client";

import { useEffect, useState, type RefObject } from "react";

export type BarTone = "bar" | "dark";

/**
 * Which tone a fixed bar should take for what is scrolling under it (decision 021).
 * Over a full-width dark block (`data-nav-tone="dark"`: the disciplines section,
 * the Prussian closing band, the footer) the bar turns graphite so it reads as part
 * of that block; everywhere else it is the Prussian bar tone.
 *
 * It looks at the point just below the bar's bottom edge (`edge: "bottom"`, the top
 * nav) or at the bar's middle (`edge: "middle"`, the section bar at the foot), and
 * asks the browser what sits there, skipping the bar itself. Checked on scroll and
 * resize (at most once per frame), and every 400 ms as well: scroll animations
 * (pins, the morphing dark frame) and the section bar sliding in move things
 * without a scroll event. Each check is one hit test, so this costs nothing.
 */
export function useToneUnder(
  ref: RefObject<HTMLElement | null>,
  edge: "bottom" | "middle",
): BarTone {
  const [tone, setTone] = useState<BarTone>("bar");

  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const bar = ref.current;
      if (!bar) return;
      const box = bar.getBoundingClientRect();
      const y = edge === "bottom" ? box.bottom + 1 : box.top + box.height / 2;
      const x = box.left + box.width / 2;
      const under = document
        .elementsFromPoint(x, y)
        .find((element) => !bar.contains(element) && !element.closest("header, nav"));
      const dark = Boolean(under?.closest('[data-nav-tone="dark"]'));
      setTone(dark ? "dark" : "bar");
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    schedule();
    const timer = window.setInterval(schedule, 400);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.clearInterval(timer);
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [ref, edge]);

  return tone;
}
