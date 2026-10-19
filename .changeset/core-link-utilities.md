---
'@oztix/roadie-core': minor
---

Add `link-normal`, `link-strong`, and `link-subtle`, the text link styles
`Link` uses, animated on hover and focus-visible with the motion tokens.
`link-normal` draws a 1/16em underline that grows into a tint behind the
text; `link-strong` colours the text with `--intent-link-text` over a
`--intent-link-underline` underline and fills a tint from the left; and
`link-subtle` raises a 2px underline and fades it in, leaving after a short
delay. Backgrounds clone per line, so a wrapped link animates on each one,
hover only changes where a pointer can hover, and reduced motion jumps to
the end state. `normal` and `subtle` are accent unless the element has its
own intent class, which sets the non-inheriting `--intent-link-own`;
`strong` follows the surrounding intent. `.prose` links use `link-normal`,
and `cn()` lets one link style replace another.
