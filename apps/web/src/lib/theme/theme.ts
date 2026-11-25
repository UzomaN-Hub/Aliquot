/**
 * Theme (decision 014). Three choices:
 * - "auto" (default): dark from 19:00, light from 08:00, by the device's clock.
 * - "light" / "dark": the person's override, remembered on this device.
 * Only the preference word is stored (localStorage), never anything personal.
 */
export type ThemePreference = "auto" | "light" | "dark";
export type Theme = "light" | "dark";

export const DARK_FROM_HOUR = 19;
export const LIGHT_FROM_HOUR = 8;
export const STORAGE_KEY = "theme";

export function isPreference(value: unknown): value is ThemePreference {
  return value === "auto" || value === "light" || value === "dark";
}

export function resolveTheme(preference: ThemePreference, now: Date = new Date()): Theme {
  if (preference !== "auto") return preference;
  const hour = now.getHours();
  return hour >= DARK_FROM_HOUR || hour < LIGHT_FROM_HOUR ? "dark" : "light";
}

/** Milliseconds until Auto would next switch, so the page flips exactly on time. */
export function msUntilNextSwitch(now: Date = new Date()): number {
  const next = new Date(now);
  const hour = now.getHours();
  const target =
    hour >= LIGHT_FROM_HOUR && hour < DARK_FROM_HOUR ? DARK_FROM_HOUR : LIGHT_FROM_HOUR;
  next.setHours(target, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

export function applyTheme(preference: ThemePreference, now: Date = new Date()): void {
  const root = document.documentElement;
  root.dataset.theme = resolveTheme(preference, now);
  root.dataset.themePreference = preference;
}

/**
 * Runs in <head> before the first paint, so the page never flashes the wrong theme.
 * Kept tiny and free of user data; it mirrors resolveTheme() (tested to agree).
 */
export const themeBootScript = `(function(){try{var p=localStorage.getItem("${STORAGE_KEY}");if(p!=="light"&&p!=="dark")p="auto";var h=new Date().getHours();var t=p==="auto"?(h>=${DARK_FROM_HOUR}||h<${LIGHT_FROM_HOUR}?"dark":"light"):p;var r=document.documentElement;r.dataset.theme=t;r.dataset.themePreference=p}catch(e){document.documentElement.dataset.theme="light"}})();`;
