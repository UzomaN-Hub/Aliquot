# Aliquot — Design Direction

**Status:** Agreed · 18 Nov 2026 · Designs made in Google Stitch from anchor screens.

## Concept
Haematoxylin & Eosin (H&E), the classic pathology stain. Calm and editorial: the content carries the design, not decoration.

## Colour (three only)
| Name | Hex | Use |
| --- | --- | --- |
| Bone | `#F6F3EC` | All backgrounds |
| Haematoxylin | `#221D45` | Text, primary buttons, navigation |
| Eosin | `#E0566F` (text-safe `#B23B56`) | Attention only: critical results, STAT, one accent per page. Under 5% of any screen |

Tints of Haematoxylin (not new colours): secondary text `#4A4470`, muted `#5E5880`, faint `#8A85A3`, selected `#E9E5F2`, row hover `#EFECF5`, hairline `#E4DFD3` (warm, from Bone).
Dark mode: Haematoxylin `#221D45` background, Bone text, Bone tints for secondary/muted text, Eosin fills unchanged, Eosin text `#E67D8E` (Eosin lightened with Bone). No pure black.

**Contrast (decision 008):** all text meets WCAG AA 4.5:1 on its background, including selected and hover rows. The smallest/lightest text colour is **muted** `#5E5880`. **Faint `#8A85A3` (3.2:1) is never used for text**, only for non-text marks. Plain Eosin `#E0566F` (3.3:1) is for fills, borders, large headline marks and critical-value outlines; Eosin *text* uses the text-safe value. Exact values for both modes live in `apps/web/src/styles/tokens.css`.

## Typography
| Font | Use |
| --- | --- |
| Instrument Serif | Landing headlines, lab name/wordmark, PDF headings only |
| Atkinson Hyperlegible Next | All interface text |
| Atkinson Hyperlegible Mono | Result values, lab numbers, units, timers (tabular figures) |

Why Atkinson: designed so similar characters (0/O, 1/l/I, 5/S) can't be confused. Misreading a result is a patient-safety issue.
Sizes: app body 14px, public pages 16px, landing headline 44–56px. Weights 400–600.
Headline setting (landing and lab wordmark): large Instrument Serif with tight letter-spacing (about -0.03em) and short line-height (about 1.0); body text keeps normal spacing. Landing headlines may end with a full stop in Eosin, Aliquot's signature mark. Used only on headlines, never in the app.

## Rules
1. **One primary action per screen.** Only filled Haematoxylin button. Everything else is a text link or appears on demand (e.g. row actions on selection).
2. **Two button styles:**
   - Marketing: full pill, Haematoxylin fill, Bone text.
   - In-app: 10px radius, Haematoxylin fill.
   - Secondary actions: underlined text link, never a second boxed button.
3. **Shape follows importance:** hero panels 28px radius · working panels 16px · nav highlight 8px · table rows square with hairline dividers, never card-per-row.
4. **No badges, pills or eyebrow tags as decoration.** Status (CH, CL, H, L, STAT) is shown as coloured text, not chips, unless a badge is functionally necessary.
5. **Hierarchy through type, not boxes.** Small muted label above a large figure replaces cards and borders.
6. **No gradients, shadows (except menus/dialogs), stock illustrations, emoji, or decorative icons.**
7. **Navigation is role-based.** Each role sees only the 3–6 items it uses.
8. **Tempo:** generous space on landing and public pages; efficient density on bench screens (36–40px rows).
9. **Flags never rely on colour alone:** H, L, CH, CL always appear as text.
10. **Grid:** 4px base. Vary container sizes deliberately by importance; never uniform blocks.
11. **Platform credit:** "Powered by Aliquot" appears once, small and muted, in sentence case, on lab-facing login and public pages. No other system labels, reference codes or version stamps.

## Feedback & states
Feedback appears where the action happened. The surface escalates only as severity rises.

### Which surface to use
| Surface | Use for | Behaviour |
| --- | --- | --- |
| Inline (field) | Validation errors | Shown on blur or submit, never while typing. Message under the field says what to do. Field border turns Eosin |
| Inline (form) | Submit with several errors | One-line summary at the top; focus moves to the first invalid field |
| Inline (row) | Background jobs (PDF, WhatsApp, SMS) | Status text in the row: "Sending…" → "Sent 10:42" or "Failed · Retry" |
| Toast | Confirming a finished, low-risk action ("Sample received", "Result saved") | Bottom-left, 4 s, one at a time, Undo link when reversible. Never for errors that need action or for critical results |
| Banner | Ongoing conditions: offline, session about to expire, section TAT breach, lab suspended, unacknowledged critical alerts | Top of the page or section, stays until the condition clears |
| Modal | Irreversible or high-stakes decisions: release, amend after release, reject sample, deactivate staff, suspend lab | Names the consequence, asks for a reason where the audit needs one. Primary button uses the action's verb ("Release result"), never "OK" |

### Severity without new colours
| Level | Treatment |
| --- | --- |
| Critical / error | Eosin text and hairline, "!" glyph, plain words ("Critical", "Couldn't save") |
| Warning | Haematoxylin text on `#E9E5F2` tint, "!" glyph, the word "Warning" |
| Success | Haematoxylin text with a check glyph. No green |
| Info | Muted Haematoxylin text, no glyph |

Result flags: CH/CL in Eosin; H/L in Haematoxylin semibold with ↑/↓. Every flag also shows its letters.

### Critical values
- On entry: the value turns Eosin and an inline line appears: "Critical. The doctor will be alerted when this result is saved." No modal, so the scientist keeps their rhythm.
- For Chief Scientists and Managers: a persistent banner with the count of unacknowledged criticals until each one is acknowledged. Not dismissible.

### Loading
- Page and table loads use skeletons shaped like the final layout. No full-page spinners.
- Show loading only after 300 ms, and hold it at least 500 ms once shown, so nothing flickers.
- Buttons keep their width, show "Saving…", and block double submits.
- Optimistic updates only for low-risk actions (mark collected). Never for verify, release or amend.

### Empty states
- First use: one sentence on what goes here, plus the single action that fills it ("No staff yet. Add staff").
- Filtered empty: say what was searched and how to clear it ("No samples match 'Eze'. Clear search").
- Nothing to do: calm confirmation ("Worklist clear").
- No illustrations.

### Errors and edge cases
- 404, 403 ("You don't have access to Haematology. Ask your manager."), 500 with a reference ID for support.
- Session expired: sign-in modal over the page, keeping unsaved entries.
- Offline: banner "You're offline. Changes can't be saved until you reconnect." Form data is kept.
- Unsaved changes: warn before leaving result entry or editors.
- Concurrent edit: "Ada saved this sample 2 min ago. Review her changes."

### Disabled controls
Avoid them. Keep controls enabled and explain on use ("Select at least one test"). Disable only when an action can never apply, and say why.

### Focus and motion
- Visible focus: 2px Haematoxylin ring with a 2px offset. Result entry works fully by keyboard.
- Motion: 150–200 ms ease-out, for state changes only. Respect reduced-motion. Landing page animation is defined in ANIMATION.md.

### Copy
Sentence case. Say what happened, then what to do. No "Oops", "successfully", "please" or exclamation marks.

## Implementation guardrails (so code can't drift)
- **Tokens only.** Tailwind config contains only Bone, Haematoxylin and its tints, and Eosin. Default Tailwind colours are removed, so no other colour can be used.
- **Fonts locked.** `font-serif` = Instrument Serif, `font-sans` = Atkinson Hyperlegible Next, `font-mono` = Atkinson Hyperlegible Mono. No other font families.
- **Components first.** Before any page: Button (marketing pill, app, text link), Field, Table, Banner, Toast, Modal, Skeleton, EmptyState, Flag. Pages compose these; no one-off styling in pages.
- **/styleguide route** renders every component and state on one page. It's reviewed and approved before page work starts.
- **Screenshot review.** Each finished page is screenshotted (Playwright) and checked against this file before it's marked done.
- **Lint:** ESLint bans raw hex values and arbitrary Tailwind colour classes in app code.
