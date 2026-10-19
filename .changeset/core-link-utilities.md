---
'@oztix/roadie-core': minor
---

Add `link-normal`, `link-strong`, and `link-subtle`, the text link styles
`Link` uses. `link-normal` underlines in `--intent-link-underline` and turns
the underline to the text colour on hover or keyboard focus; `link-strong`
also colours the text with `--intent-link-text`; and `link-subtle` shows the
underline only on hover or keyboard focus. Hover only changes the underline
where a pointer can hover. Each intent sets the two new tokens: accent in
neutral, and the intent's own colour otherwise. `.prose` links now use
`link-normal`, so inside an `intent-*` surface they take that intent's
underline, and `cn()` lets one link style replace another.
