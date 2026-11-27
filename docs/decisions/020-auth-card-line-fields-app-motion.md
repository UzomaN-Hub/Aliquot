# 020 — Wide auth card, line fields, the Aliquot mark, and quiet motion in the app

**Date:** 2026-11-27 · **Status:** Accepted (extends 014 and 018; changes DESIGN.md rules 2, 3, 4, 7a and "Focus and motion", ANIMATION.md scope, CLAUDE.md design rules)

## Context
Uzoma reviewed the sign-in pages against the reference's login (trustedtrucks.com, studied in a real browser: sizes, field styles, hover and focus states). His points:
- Our auth panel (460px wide) felt small and ordinary. He wanted it wider and taller.
- Fields didn't have to be boxes: one bold underline is more distinctive. Use it on most fields, not all.
- Sign-in and set-password should carry "Need help?", privacy policy and support links, even before those pages exist.
- The company name should carry a less generic mark, and be bigger on the landing nav and everywhere it introduces the platform.
- Motion only on the landing made the rest of the product feel static. He asked for small animations on every page, profiles included.

CLAUDE.md said "Animation exists only on the landing hero" and "no decorative badges or pills". Both changed with his agreement. While checking this, we also found that dialogs no longer blurred the page: the overlay had been dropped in the landing v2 change. It's restored here and now tested.

## Decision
**Auth card (DESIGN.md 7a).** One card, up to 720px wide and at least 560px tall on desktop (28px corners, as the landing's hero panels). It's shaped like a request form:
- a strip naming who it's for ("Tavnit Labs · staff") and what this page does (a small ink tag: "Sign in", "Set password", "Join");
- a dashed, perforated rule;
- a big Instrument Serif headline: words rise out of a mask, the last part is in Prussian, and the full stop is Eosin;
- the form;
- a foot with help on the left ("Need help? Ask your lab manager.") and Privacy policy · Terms on the right.

Above the card: the name, large (lab name on lab pages, the Aliquot wordmark on console pages), a "Secure sign-in" status with a breathing dot, and the theme control. Links to pages that don't exist yet open the shared "Coming soon" dialog. That includes "Forgot your password?", which waits for email.

**Line fields.** `Field look="line"`:
- a numbered mono label ("01 EMAIL"); the number sits beside the label, so the field's name stays "Email";
- a 2px ink-faint underline (3:1, a non-text mark) that turns Eosin when invalid;
- on focus, a 3px Prussian line draws across from the left. That line is the focus indicator, so no outline ring.

Used on sign-in, set-password, accept-invite and the 2FA code. The box stays for:
- bench screens and result entry, where cells need edges;
- search;
- multi-line text (Textarea);
- dense console forms, until they're redesigned.

**Big pill (Button `size="xl"`).** 60px, full width, label left and an arrow tile right that nudges on hover; Prussian, ink on hover. Only on sign-in style pages. In-app buttons stay 2px near-square (decision 009).

**The Aliquot mark.** A tube with a drop of Eosin falling into it: an aliquot is a measured portion. It's drawn in SVG and sized in `em`, so it follows the name. On arrival the drop falls and the level rises; on hover the drop bobs. The wordmark (`Wordmark`, name from `PLATFORM_NAME`) is used on the landing nav and footer (`text-wordmark`, 40–56px), console sign-in and the console top bar. The top bar grows to 72px, and lab names in it grow to 28px.

**Quiet motion in the app.** A few named entrances. All are CSS only, transform and opacity only, under 0.7 s, and start on the first frame:
- `animate-page`: each page settles in on arrival, keyed by address;
- `stagger`: forms, table rows and profile details arrive in reading order (after 12 they arrive together);
- `animate-pop`: dialogs and menus;
- the top-bar's current rule draws in;
- line fields draw their focus line.

Rules:
- Never animate a result value, a flag, or anything someone is reading to make a decision. A critical value turning Eosin is a state change, not decoration.
- Nothing loops except the auth status dot.
- With reduced motion, every animation is `none`: things are simply there.

## Alternatives considered
- **Keep the 460px panel and box fields:** what Uzoma called ordinary; the common AI/shadcn login.
- **Underline fields everywhere:** dense bench grids and multi-line text need edges to show where to type. Hence "most, not all".
- **A JavaScript animation library in the app (GSAP or Motion):** the entrances are simple. CSS starts on the first frame, costs no bundle, and can't leave content hidden if a script fails.
- **Near-zero animation duration for reduced motion:** WebKit still painted a hidden frame. `none` is exact.
- **The number inside the label:** made the field's name "01Email" for screen readers and tests.

## Consequences
- New: `AuthFrame`/`AuthCard`/`AuthTitle`/`AuthLead`/`AuthNote`/`SoonLink`, `Wordmark`/`AliquotMark`, `PageEnter`, `Field look="line"`, Button `xl`, `ComingSoon` moved to `components/patterns`.
- New tokens: `text-wordmark`, `tracking-label`, `animate-fade|pop|rise|page|breathe`. CSS helpers: `.stagger`, `.rise-mask`/`.rise-word`, `.field-line`, `.mark-*`, `.nav-current`.
- Browser tests: `e2e/look-and-motion.spec.ts` (card size and links, real blur, plain field names, reduced motion, nav colour and wordmark size).
- How the motion works: `docs/learning/app-motion.md`.
