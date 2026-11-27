/**
 * Landing-page motion switch (decision 017).
 * Motion runs unless the device asks for reduced motion or the visitor pressed
 * "Pause motion" (remembered on this device; only the word "paused" is stored).
 *
 * `motion-on` on <html> is what lets CSS hide content before its entrance; without it
 * (no JavaScript, reduced motion, paused) everything is simply visible.
 */
export const MOTION_KEY = "motion";
export const MOTION_EVENT = "motionchange";

export function motionAllowed(): boolean {
  try {
    if (localStorage.getItem(MOTION_KEY) === "paused") return false;
  } catch {
    // storage blocked: fall through to the device setting
  }
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function setMotionPaused(paused: boolean): void {
  try {
    if (paused) localStorage.setItem(MOTION_KEY, "paused");
    else localStorage.removeItem(MOTION_KEY);
  } catch {
    // storage blocked: the choice lasts for this page only
  }
  document.documentElement.classList.toggle("motion-on", !paused && motionAllowed());
  window.dispatchEvent(new Event(MOTION_EVENT));
}

/** Runs in <head> before first paint, with the theme script. Static; no user data. */
export const motionBootScript = `(function(){var r=document.documentElement;r.classList.add("js");try{if(localStorage.getItem("${MOTION_KEY}")!=="paused"&&!matchMedia("(prefers-reduced-motion: reduce)").matches)r.classList.add("motion-on")}catch(e){}})();`;
