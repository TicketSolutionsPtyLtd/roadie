---
'@oztix/roadie-core': minor
---

Add `link-normal`, `link-strong`, and `link-subtle`, the text link styles
`Link` uses, animated on hover and focus-visible with the motion tokens.
Each includes `is-focusable`'s ring, so a bare link needs no other class.
Every emphasis draws the same 1/16em underline. `link-normal` grows a tint up
from it. `link-strong` takes its text from `--intent-link-text` and its
underline from the intent, then fills from the left with `emphasis-strong`'s
colours after a short pause on hover, recolouring each letter as the fill
reaches it; it falls back to plain underlined system colours in forced
colours. In both, the underline blends into the fill as it completes, so they
read as one shape. `link-subtle` raises its underline and fades it in, leaving
after a short delay. Backgrounds clone per line, so a wrapped link animates on
each one, hover only changes where a pointer can hover, and reduced motion
jumps to the end state. `normal` and `subtle` are accent unless the element
has its own intent class, which sets the non-inheriting `--intent-link-own`;
`strong` follows the surrounding intent, neutral included. `.prose` links use
`link-normal`, motion included, and `cn()` lets one link style replace
another.
