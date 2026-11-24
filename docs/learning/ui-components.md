# UI components: cn, CVA, Radix Slot, Testing Library

Every screen is built from components in `src/components/ui/` (DESIGN.md "Components first"). These tools make one component serve every case without one-off styling.

## `cn()` = clsx + tailwind-merge
**What it is:** a helper that joins class names. `clsx` drops the falsy ones (`pending && "cursor-progress"`). `tailwind-merge` then removes conflicts, so the last class wins: `cn("rounded-control", "rounded-full")` → `rounded-full`.
**Why we use it:** a page can adjust a component (`<Button className="w-full">`) without two classes fighting over the same CSS property. Which one wins would otherwise depend on the order inside Tailwind's CSS file, not the order you wrote them.
**Without it:** "I added the class but nothing changed" bugs.
**Our twist (`src/lib/cn.ts`):** our sizes (`text-caption`, `text-body`) and shapes (`rounded-control`) are custom, so we list them for tailwind-merge. Otherwise it reads `text-caption` as a colour and silently deletes `text-ink` next to it. The test in `cn.test.ts` guards this.

## CVA (class-variance-authority)
**What it is:** a function that maps props to classes: `variant: "primary" | "link" | "marketing"`, `size: "md" | "lg"`. `compoundVariants` adds classes for a combination (primary + lg = 44px tall).
**Why we use it:** all the styling choices for a component sit in one table, typed. `<Button variant="primry">` is a TypeScript error.
**Without it:** long `if/else` chains building class strings, easy to get out of step.

## Radix Slot (`asChild`)
**What it is:** `<Button asChild><Link href="…">…</Link></Button>` renders the **Link** with the Button's classes, instead of wrapping it in a `<button>`.
**Why we use it:** a link that looks like a button must still be a real `<a>`: right-click "open in new tab", correct screen-reader role, and no invalid `<button><a>` nesting.
Radix ships accessible building blocks (Dialog, Slot…) with no styling of their own; we add ours. We use the single `radix-ui` package.

## Button decisions (`src/components/ui/button.tsx`)
| Choice | Why |
| --- | --- |
| `type="button"` by default | A plain `<button>` inside a form submits it. Only a real submit button says `type="submit"` |
| `pending` blocks clicks with `aria-disabled`, not `disabled` | A disabled button loses focus and screen readers skip it. Ours stays focusable and says it's busy (`aria-busy`) |
| No spinner; `pendingLabel="Saving…"` | DESIGN.md: say what's happening. Spinners are the generic default |
| Both labels stacked in one grid cell | The button is as wide as its longer label, so it doesn't jump when "Save" becomes "Saving…" |
| 2px corners, 36px (bench) / 44px (touch) | Decision 009; FRONTEND.md §14 |

## Field decisions (`src/components/ui/field.tsx`, `password-input.tsx`)
| Choice | Why |
| --- | --- |
| Order: label → hint → control → error | When an error appears under the field, the hint above doesn't move, and a screen reader hears the hint before the box |
| React **context** links Field to its Input | Field creates one id (`useId`) and shares it. The label, hint and error always point at the right box, and an Input outside a Field throws, so no unlabeled input can ship |
| Field edge is `ink-faint`, not `hairline` | WCAG 1.4.11: a control's edge needs 3:1 against the background. Hairline is about 1.2:1, so the field would be invisible to many users |
| "(optional)" marks the exceptions | Most clinical fields are required. Red asterisks everywhere are the generic default |
| "Show"/"Hide" word, not an eye icon | No decorative icons (DESIGN.md), and a word can't be misread |
| `mono` prop | Lab numbers and values in Atkinson Mono: 0/O and 1/l/I can't be confused |
| The form decides *when* to show `error` | DESIGN.md: on blur or submit, never while typing. React Hook Form does this later; Field only displays it |

## /styleguide
`http://localhost:3000/styleguide` while `pnpm dev` runs. It shows every component and state in light and dark side by side. On a deployed build it's a 404 unless the host sets `STYLEGUIDE_ENABLED=true`.

## Testing Library + jsdom
**What it is:** `@testing-library/react` renders a component in a fake browser (**jsdom**) and lets the test find things the way a person would: `getByRole("button", { name: "Save" })`. `user-event` clicks and types like a real user. `jest-dom` adds checks like `toHaveAttribute`.
**Why we use it:** testing by role and name also tests accessibility. If a screen reader can't find the button, the test can't either.
**Without it:** tests that check class names or internal state, which break on every refactor and miss real bugs.
- Component tests start with `// @vitest-environment jsdom`; other tests stay on fast plain Node.
- `src/test/setup.ts` loads the matchers and cleans up the page after each test.
- jsdom 31 needs Node ≥ 22.22.2 (`package.json` "engines"). Update with `nvm install 22` then `nvm use <version>`.

## Where it's used in Aliquot
`src/lib/cn.ts` · `src/components/ui/button.tsx` (+ `.test.tsx`) · `src/test/setup.ts` · `vitest.config.mts`
