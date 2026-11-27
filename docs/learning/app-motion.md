# Quiet motion in the app (CSS animations)

**Where:** `apps/web/src/styles/globals.css` (section "App motion" and the `--animate-*` tokens), `components/patterns/page-enter.tsx`, `auth-frame.tsx`, `wordmark.tsx`, `components/ui/field.tsx`. Decision 020.

## What it is
A **CSS animation** has two parts. `@keyframes` describes how something looks at the start and end (and points in between). `animation: name duration easing delay fill-mode` plays it on an element. The browser runs it on its own, without JavaScript.

```css
@keyframes rise { from { opacity: 0; transform: translateY(18px); } }
.card { animation: rise 640ms cubic-bezier(0.22, 1, 0.36, 1) both; }
```

- Only `from` is written; `to` is the element's normal look.
- `both` (fill-mode) holds the `from` state during any delay and the end state afterwards, so nothing flashes before its turn.

## Why we use it this way
- **The page doesn't wait for a script.** CSS animations start on the first frame. If a script fails, nothing stays hidden.
- **`transform` and `opacity` only.** The browser can move and fade these without recalculating the layout, so the motion stays smooth on a cheap phone.
- **Named tokens.** In `@theme` we declare `--animate-rise`, `--animate-pop` and so on. Tailwind turns each into a class (`animate-rise`), so every page uses the same few movements. One vocabulary = a calm, consistent product.

## The pieces
| Piece | What it does | Used on |
| --- | --- | --- |
| `animate-page` | The page rises 8px and fades in (0.42 s) | Every console and lab page (`PageEnter`, keyed by the address so it replays) |
| `.stagger` | Each direct child rises in turn, 55 ms apart (CSS variable `--i` set by `:nth-child`) | Sign-in forms, table rows, profile details |
| `.rise-mask` + `.rise-word` | Each headline word slides up out of a clipped box | Sign-in style headlines (`AuthTitle`) |
| `.field-line::after` | A 3px Prussian line grows from the left (`scaleX` 0 → 1) on `:focus-within` | Line fields |
| `animate-pop` | A small scale-and-fade | Dialogs, the app menu |
| `.mark-drop` / `.mark-level` | The Eosin drop falls into the tube, the level rises | The Aliquot mark |
| `.nav-current::after` | The top bar's current rule draws in | Top bar |
| `animate-breathe` | A slow pulse (the only loop) | "Secure sign-in" dot |

## What goes wrong without care
- **Motion on clinical values** distracts from a decision. We never animate a result, flag or anything being verified.
- **Long or looping motion** makes a work tool feel slow. Everything ends within 0.7 s; after 12 rows, rows arrive together.
- **Reduced motion.** Some people get dizzy or nauseous from movement. When their device asks for reduced motion, we set `animation: none` on everything. We tried a 0.01 ms duration first, but WebKit (Safari) still painted one hidden frame, which the browser test `e2e/look-and-motion.spec.ts` caught.
- **Centring with `transform`.** An animation on `transform` replaces it. Tailwind 4 centres dialogs with the separate `translate` property, so the dialog's `animate-pop` can use `transform` safely.

## Try it
Open `/styleguide`, then the sign-in page. Focus a field and watch the line draw across; hover the Aliquot wordmark and watch the drop bob. Turn on "Reduce motion" in Windows (Settings → Accessibility → Visual effects → Animation effects off) and reload: everything is just there.
