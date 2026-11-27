# Aliquot — Landing Page Animation

**Status:** Agreed · 18 Nov 2026 · **Updated 27 Nov 2026 (decision 017):** the landing page now has motion throughout (GSAP, ScrollTrigger, SplitText, Lenis). The hero is a full-screen headline with an animated SVG "aliquot" figure (one tube → three lanes → stacks of verified results). The drawn, blurred blood film from sign-in appears behind the closing section; the WebGL "stain" below stays as a possible later upgrade. How it's built: `docs/learning/landing-motion.md`.
**Scope:** The landing-page hero. The rest of the landing page uses quiet scroll fades. Sign-in pages have one ambient motion: the blurred blood-film backdrop drifting slowly (60 s, transform only, off for reduced motion; decision 014). The lab app, console and public result pages have no decorative motion (state changes only, 150–200 ms, per DESIGN.md).

## Concept: "The stain"
The hero is a full-screen haematology blood film under a microscope. It starts unstained and out of focus. One Eosin drop falls onto the slide, and the Leishman/Wright stain (eosin + methylene blue) spreads from that point: nuclei and platelets turn purple first, then red cells flush pink. A Haematoxylin-ink overlay settles, and the headline appears.
**Why it's ours:** the stain colours *are* our palette (Bone, Haematoxylin, Eosin), it shows a test Aliquot actually handles, and an aliquot is literally one measured drop.

## Timeline (total ≈ 4.8 s, plays once per visit)
| Time | Event | Detail |
| --- | --- | --- |
| 0.0–1.2 s | Focus pull | Canvas blur 7px → 0, ease-out |
| 0.6–1.25 s | Drop falls | 16px Eosin drop falls from ~55% viewport height above its landing point; stretches slightly while falling, squashes on landing |
| 1.25–2.45 s | Ripple + soak | One 1.5px Eosin ring expands ×9 and fades; the drop scales up and fades as it's absorbed |
| 1.3–3.7 s | Purple spreads | Nuclei and platelets take their stain along an organic front (distance from the drop + fractal noise), ease-out cubic |
| 2.1–4.7 s | Pink follows | Red cells and background take the full stain along a second, slightly different noise front |
| 3.0–4.2 s | Overlay settles | Haematoxylin `#221D45` overlay rises from 12% to 42% opacity |
| 3.6–4.05 s | Headline | Words rise 18px and fade in, 150 ms apart |
| 4.3–4.45 s | Supporting line, then actions | Same rise |
| 4.5 s | Signature mark | Eosin full stop pops in at the end of the headline |

## Layout
- Full-bleed hero, image covers the viewport (cover fit, centred on the main cell).
- Drop lands just beside the central white cell (≈ 52% x, 50% y).
- Nav: Aliquot wordmark (Instrument Serif) left, "Sign in" underlined link right, both in Bone.
- Copy bottom-left, max 560px: headline (Instrument Serif, clamp 44–84px, letter-spacing −0.035em, line-height 0.98), supporting line (17px, Bone at 82%), actions: Bone pill "Book a demo" + underlined Bone "See how it works".
- No card or panel behind text; the overlay provides contrast (check ≥ 4.5:1 for the supporting line).
- Mobile (< 700px): same order, 20px margins, headline 44px.

## Image
- **Subject:** Wright- or Leishman-stained peripheral blood film, one clear white cell near the centre, red cells and platelets around it.
- **Licence:** CC0 or own photograph only (no patient identifiers, permission from the lab). Prototype used a CC BY-SA 4.0 Commons image, which needs attribution; replace it before launch.
- **Delivery:** 2048px wide, AVIF with WebP and JPEG fallbacks, target under 250 KB. Also a tiny (32px) blurred placeholder.
- The "unstained" state is generated in the shader from the same image; no second image file.

## How it's built
- **One WebGL fragment shader** on a full-screen quad (no 3D library). Inputs: the image texture, drop position, `pH` (purple progress), `pE` (pink progress), `ov` (overlay amount).
  - Unstained colour: image luminance mapped onto Bone with faint grey structure.
  - Purple mask: pixels where blue exceeds red and luminance is mid-to-dark (nuclei, platelets).
  - Spread front: `distance from drop + (fbm noise − 0.5) × 0.55`, smoothstepped against progress, so the edge creeps unevenly like real stain.
  - Overlay: final colour mixed toward `#221D45` by `ov`.
- **Drop, ripple and text:** plain DOM + CSS keyframes (cheap, crisp at any resolution).
- **Text motion:** Motion (motion.dev) or CSS only; landing page bundle only.
- Reference prototype: `docs/prototypes/hero-stain.html` (working code from the design session).

## Performance rules
- The page's largest paint is the **static first frame** (unstained, blurred placeholder, then image), not the canvas, so LCP stays under 2 s.
- WebGL starts only after the image has decoded; the render loop stops at 4.8 s (no idle GPU use).
- Device pixel ratio capped at 2. Canvas resizes on window resize and redraws the final frame.
- Animate only transform, opacity and the shader; never layout properties.
- Landing JS for the hero ≤ 15 KB gzipped (excluding Motion, if used).

## Accessibility and fallbacks
- `prefers-reduced-motion: reduce` → no blur, no drop, no spread: the fully stained image with overlay and the text appear immediately.
- No WebGL → the stained image as a CSS background with the same overlay; text animates normally.
- Text is real HTML (selectable, readable by screen readers); the canvas is `aria-hidden`.
- Plays once per session (sessionStorage flag); returning in the same session shows the final state.

## Rest of the landing page
- Sections fade up 12px as they enter the viewport, once each, 400 ms.
- "Paper logbook vs Aliquot": crossfade between a handwritten logbook row and a clean worklist row.
- Live worklist demo: rows arrive one by one, mirroring real-time updates in the app.
- Critical alert demo: a K⁺ value turns Eosin, then the escalation line draws: doctor → Chief Scientist → Manager.
- No parallax, particles, 3D or looping background motion anywhere.

## Later (not v1)
- Rotate the hero between a blood film and a Gram stain (crystal violet → safranin) per visit.
- Desktop only: slow slide drift following the cursor after the animation ends.
