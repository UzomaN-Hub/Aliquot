import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge only knows Tailwind's default scales. Ours are custom
 * (globals.css @theme), so we teach it their names. Without this it reads
 * `text-caption` as a COLOUR and silently drops `text-ink` next to it.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["caption", "body", "body-lg", "title", "figure", "display", "hero-sm", "hero"],
      radius: ["control", "panel", "hero"],
      shadow: ["overlay"],
      tracking: ["headline"],
    },
  },
});

/** Join class names; when two classes set the same thing, the last one wins. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
