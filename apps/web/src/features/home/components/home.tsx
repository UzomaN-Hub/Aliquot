"use client";

import { firstName, greeting, roleLabels, sectionLabels } from "@/lib/format/labels";
import { useSessionStore } from "@/stores/session";

/**
 * Home (PAGES.md 9). Content changes by role; for now it greets the person and
 * states where they work. Each role's work (worklist, queue, front desk) lands here
 * as its stage ships.
 */
export function Home() {
  const session = useSessionStore((state) => state.session);
  if (!session) return null;
  const { user, lab } = session;

  const sections = user.sections.map((section) => sectionLabels[section]);
  const where = sections.length > 0 ? sections.join(", ") : lab.name;

  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <h1 className="text-display font-medium">
        {greeting(lab.timezone)}, {firstName(user.fullName)}.
      </h1>
      <p className="text-body-lg text-ink-secondary">
        {user.roles.map((role) => roleLabels[role]).join(", ")} · {where}
      </p>
    </div>
  );
}
