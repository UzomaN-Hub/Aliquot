# 017 — Landing page motion with GSAP, ScrollTrigger, SplitText and Lenis

**Date:** 2026-11-27 · **Status:** Accepted (extends ANIMATION.md beyond the hero)

## Context
The landing page is the first thing anyone sees of Aliquot. Uzoma wants motion throughout (word and letter reveals, a full-screen hero with an animated figure, a dark section whose frame changes as you scroll, hover accordions), without lag, on phones too. The reference he admired is built with GSAP, ScrollTrigger and Lenis on Next.js, animating only SVG, transforms and opacity. ANIMATION.md had limited motion to the hero (with Motion or CSS).

## Decision
- **GSAP 3.15** (free for commercial use since 2025) with **ScrollTrigger** (scroll-linked and pinned animation) and **SplitText** (letters, words and lines, re-split on resize and font load). **Lenis** for smooth wheel and trackpad scrolling; touch keeps native scrolling.
- **The landing page only.** The motion code is one chunk loaded after first paint (`features/landing/motion/start-motion.ts`, imported dynamically), so it never delays the page and never ships to the lab app or console.
- **The hero headline is plain CSS,** starting on the first frame: it's the page's largest paint (LCP) and must not wait for a script. GSAP drives the hero figure and everything below it.
- **Hidden only when motion will run:** `<html class="motion-on">` (set before paint, off for reduced motion and "Pause motion") is the only thing that hides content before its entrance. A 2.5 s CSS fallback shows everything if the motion code never loads.
- **Pause motion** (WCAG 2.2.2) in the footer stops all motion and is remembered; it works alongside the device's reduced-motion setting.
- **Only cheap properties move:** transform, opacity, clip-path, SVG stroke. The hero loop pauses off screen. The pinned "journey" is desktop-only; phones get a plain list.
- **Our own design:** Aliquot's colours, fonts, copy and illustrations (the aliquot figure). The reference informs technique and quality, never look or content.
- **Fluid landing type sizes** `text-headline` and `text-mega` (CSS `clamp`), landing only. Section numbers in mono are navigation, not decorative eyebrows.

## Alternatives considered
- **Motion (motion.dev):** good for component transitions, weaker for scroll choreography, pinning and text splitting; we'd rebuild what ScrollTrigger and SplitText already do well.
- **CSS scroll-driven animations (`animation-timeline`):** no library, but not yet in every target browser (Safari support is partial).
- **WebGL hero (the original "stain" plan):** striking, but heavier, riskier on mid-range phones, and it needs a licensed micrograph. The drawn blood film appears in the closing section instead.

## Consequences
- About 50 KB (gzipped) of animation code, loaded after first paint on the landing page only.
- Browser tests cover the landing page on desktop, phone and reduced motion (`e2e/landing.spec.ts`); `e2e/capture.spec.ts` takes review screenshots on request.
- New sections should use the same data attributes (`data-split`, `data-reveal="fade"`, `data-count`) instead of writing new animation code.
