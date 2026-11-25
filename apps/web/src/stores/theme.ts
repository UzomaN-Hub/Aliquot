import { create } from "zustand";

import { applyTheme, isPreference, STORAGE_KEY, type ThemePreference } from "@/lib/theme/theme";

type ThemeState = {
  preference: ThemePreference;
  /** Read what the boot script already applied (client only). */
  hydrate: () => void;
  setPreference: (preference: ThemePreference) => void;
};

export const useThemeStore = create<ThemeState>()((set) => ({
  preference: "auto",
  hydrate: () => {
    const stored = document.documentElement.dataset.themePreference;
    set({ preference: isPreference(stored) ? stored : "auto" });
  },
  setPreference: (preference) => {
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Private mode or storage disabled: the choice lasts for this page only.
    }
    applyTheme(preference);
    set({ preference });
  },
}));
