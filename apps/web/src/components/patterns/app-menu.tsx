"use client";

import Link from "next/link";
import { DropdownMenu } from "radix-ui";

import type { ThemePreference } from "@/lib/theme/theme";
import { useThemeStore } from "@/stores/theme";

export type MenuDestination = { href: string; label: string; description: string };

const themeOptions: { value: ThemePreference; label: string; hint: string }[] = [
  { value: "auto", label: "Auto", hint: "Light from 08:00, dark from 19:00" },
  { value: "light", label: "Light", hint: "Always light" },
  { value: "dark", label: "Dark", hint: "Always dark" },
];

const itemClass =
  "flex cursor-pointer flex-col rounded-control px-3 py-2 text-body outline-none data-[highlighted]:bg-selected";

/**
 * The top-right menu (decision 014): everything this person can do, who they are,
 * the theme, and Sign out. Used by the lab app and the platform console.
 * Radix gives it the menu keyboard model (arrows, Esc, typeahead) and focus return.
 */
export function AppMenu({
  name,
  email,
  detail,
  destinations,
  onSignOut,
  signingOut,
}: {
  name: string;
  email: string;
  detail: string;
  destinations: MenuDestination[];
  onSignOut: () => void;
  signingOut: boolean;
}) {
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Open menu"
        className="grid size-10 cursor-pointer place-items-center rounded-control text-on-bar transition-colors hover:bg-on-bar/10 data-[state=open]:bg-on-bar/15"
      >
        {/* Nine dots: "everything you can do". Functional, not decorative. */}
        <span aria-hidden="true" className="grid grid-cols-3 gap-[3px]">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="size-[5px] rounded-[1px] bg-current" />
          ))}
        </span>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          data-surface
          align="end"
          sideOffset={8}
          className="z-50 w-80 origin-(--radix-dropdown-menu-content-transform-origin) animate-pop rounded-panel border border-hairline bg-surface-raised p-2 text-ink shadow-overlay"
        >
          <div className="px-3 pt-2 pb-3">
            <p className="text-body font-medium">{name}</p>
            <p className="text-caption text-ink-muted">{email}</p>
            <p className="mt-1 text-caption text-ink-secondary">{detail}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-hairline" />

          <DropdownMenu.Group aria-label="Go to">
            {destinations.map((destination) => (
              <DropdownMenu.Item key={destination.href} asChild className={itemClass}>
                <Link href={destination.href}>
                  <span className="font-medium">{destination.label}</span>
                  <span className="text-caption text-ink-muted">{destination.description}</span>
                </Link>
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Group>
          <DropdownMenu.Separator className="my-1 h-px bg-hairline" />

          <DropdownMenu.Label className="px-3 pt-2 pb-1 text-caption text-ink-muted">
            Theme
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            value={preference}
            onValueChange={(value) => setPreference(value as ThemePreference)}
            className="grid grid-cols-3 gap-1 px-2 pb-2"
          >
            {themeOptions.map((option) => (
              <DropdownMenu.RadioItem
                key={option.value}
                value={option.value}
                title={option.hint}
                onSelect={(event) => event.preventDefault()} // keep the menu open
                className="cursor-pointer rounded-control border border-hairline px-2 py-1.5 text-center text-caption font-medium text-ink-muted outline-none data-[highlighted]:border-ink-faint data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-on-primary"
              >
                {option.label}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
          <DropdownMenu.Separator className="my-1 h-px bg-hairline" />

          <DropdownMenu.Item disabled={signingOut} onSelect={onSignOut} className={itemClass}>
            {signingOut ? "Signing out…" : "Sign out"}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
