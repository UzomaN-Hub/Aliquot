# Landing motion: GSAP, ScrollTrigger, SplitText, Lenis

| Tool | What it is | Why we use it | Without it |
| --- | --- | --- | --- |
| **GSAP** | An animation engine: "move this from here to there over 0.8 s with this easing", chained into **timelines** | Precise, fast and identical in every browser; timelines choreograph many parts (the hero figure) | Hand-written `requestAnimationFrame` loops and CSS keyframes that can't be sequenced or reversed |
| **ScrollTrigger** | Ties animations to the scroll position: start when a section enters, **scrub** (follow the scroll exactly), **pin** (hold a section still while scrolling continues) | The dark section's opening frame, the pinned journey, everything that plays "as you arrive" | Scroll listeners doing maths on every frame (jank) |
| **SplitText** | Splits a heading into letters, words or lines (spans), keeping it readable to screen readers | Letter-by-letter headlines and line-by-line paragraphs | Hand-splitting text, broken wrapping, screen readers reading single letters |
| **Lenis** | Smooth, weighted scrolling for mouse wheels and trackpads | The calm, premium scroll feel; keeps ScrollTrigger in sync | Jerky wheel steps; touch is left native on purpose |

## How it's wired (`apps/web/src/features/landing/`)
1. **Static first:** every section is a Server Component: plain HTML, visible and indexable.
2. `<html class="motion-on">` is set before paint by `lib/motion/motion.ts`, unless the device prefers reduced motion or the visitor pressed **Pause motion**. Only then does CSS hide content waiting for its entrance.
3. `motion/landing-motion.tsx` loads `motion/start-motion.ts` **after** the page shows (`import()`), so the ~50 KB of animation code never delays the first paint.
4. `start-motion.ts` finds elements by **data attributes** and animates them:

| Attribute | Effect |
| --- | --- |
| `data-split="chars"` | Letters arrive one by one (section headlines) |
| `data-split="words"` | Lines rise out of masks (paragraphs) |
| `data-reveal="fade"` | Rises softly, in batches |
| `data-count="15"` | Counts up from 0 |
| `data-morph` | Full-bleed on arrival; rounds and insets only as you leave |
| `data-journey` | Pinned on desktop; scroll walks the steps |
| `data-critical` | The critical-value demo replays each time you arrive |
| `data-aliquot` | The hero figure's timeline and idle loop |

   Added in v2 (decision 018): `data-drop` (letters fall in, random order), `data-scramble` (labels decode), `data-delivery` (the phone sequence), the journey **track** (a tube travels while the section is pinned). Every entrance uses `toggleActions: "restart none restart none"`, so it **replays** whenever you come back. `ScrollTrigger.sort()` before `refresh()` keeps triggers in page order when a pin adds scroll space.
   Hero layers (session 13): floating cards carry `data-depth` and follow the pointer (`gsap.quickTo`, a cheap "chase this value" tween); each tab change dispatches a `herotab` event and the figure sends a burst of drops into that lane. The marquee is plain CSS; scrolling raises its `playbackRate` through the Web Animations API (`element.getAnimations()`), then it eases back.
   **Refresh starts at the top:** `landingScrollBootScript` (in `<head>`) sets `history.scrollRestoration = "manual"` on the landing page and, on a reload, drops any `#section` from the address. A fresh visit to a shared `/#safety` link still goes there.
5. **Cleanup:** everything is created inside a `gsap.context`, so "Pause motion" (or leaving the page) reverts it in one call.

## Why it doesn't lag
- Only transform, opacity, clip-path and SVG strokes animate: the browser moves pixels on the GPU, never recalculates layout.
- The hero headline animates with CSS from the first frame (it's the largest paint).
- The hero loop pauses off screen; pinning is desktop-only; phones keep native scrolling.

## Check it
`pnpm e2e --project=chromium landing` (browser tests) · `$env:CAPTURE="1"; pnpm e2e --project=chromium capture` (screenshots in `test-results/capture/`).
