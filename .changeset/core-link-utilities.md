---
'@oztix/roadie-core': minor
---

Add `link-normal`, `link-strong`, and `link-subtle`, the text link styles
`Link` uses, animated on hover and focus-visible with the motion tokens.
Every emphasis draws the same 1/16em underline. `link-normal` grows a tint
up from it, and `link-strong` colours the text with `--intent-link-text`
and fills a tint from the left; in both, the underline blends into the tint
as the fill completes, so they read as one shape. `link-subtle` raises its
underline and fades it in, leaving after a short delay. Backgrounds clone per line, so a wrapped link animates on each one,
hover only changes where a pointer can hover, and reduced motion jumps to
the end state. `normal` and `subtle` are accent unless the element has its
own intent class, which sets the non-inheriting `--intent-link-own`;
`strong` follows the surrounding intent. `.prose` links use `link-normal`,
and `cn()` lets one link style replace another.
