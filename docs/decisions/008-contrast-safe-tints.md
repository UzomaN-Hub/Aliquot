# 008 — Contrast-safe tints; faint is never text

**Date:** 2026-11-23 · **Status:** Accepted (confirmed at the /styleguide approval)

## Context
TESTING.md's release gate requires zero serious axe-core violations; low text contrast is one. Checking DESIGN.md's colours against WCAG AA (4.5:1 for normal text):

| Pair | Ratio | Result |
| --- | --- | --- |
| Faint `#8A85A3` on Bone | 3.18 | Fails (used for 12px column headers, "Powered by") |
| Eosin text-safe `#C23E58` on Bone | 4.60 | Passes |
| `#C23E58` on selected `#E9E5F2` / hover `#EFECF5` | 4.11 / 4.36 | Fails (a critical flag in a selected row) |
| Eosin `#E0566F` on Haematoxylin (dark mode) | 4.31 | Fails |

## Decision
- **Faint is never used for text.** Small text (column headers, captions, "Powered by") uses muted `#5E5880` (5.95:1). Faint stays for non-text marks.
- **Eosin text-safe becomes `#B23B56`:** `#C23E58` mixed 10% toward Haematoxylin. 5.19:1 on Bone, 4.64:1 on selected rows.
- **Dark mode:** background Haematoxylin `#221D45`. Text tints are Bone mixed into it: secondary 75% `#C1BDC2` (8.5:1), muted 62% `#A5A2AD` (6.3:1), faint 50% `#8C8899` (4.6:1). Eosin text `#E67D8E` (Eosin 75% + Bone, 5.8:1; 4.7:1 on selected). Eosin fills unchanged.
- Values live only in `apps/web/src/styles/tokens.css`.

## Alternatives considered
- **Keep the Stitch values:** matches the approved PNGs exactly, but fails our own accessibility gate and makes small labels hard to read on cheap, bright-sunlight phone screens.
- **Use plain Eosin for dark-mode text ("Eosin unchanged"):** simplest reading of DESIGN.md; fails AA for small text.
- **Avoid Eosin text on selected rows:** would make a critical flag look different when its row is selected; inconsistent and easy to get wrong.

## Consequences
- Still three colours: every new value is a mix of Bone, Haematoxylin and Eosin.
- Column headers look slightly darker than the Stitch PNGs.
- Contrast is part of review: new token pairs get checked before use.
