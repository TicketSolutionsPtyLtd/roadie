---
'@oztix/roadie-core': minor
---

Add `is-focusable`, the focus ring of `is-interactive` with no pointer cursor, press, or disabled state, for an element that takes focus but isn't clicked, such as a scroll region or a `tabIndex={-1}` landing target. Its ring comes from `--focus-ring-width`, `--focus-ring-opacity`, and `--focus-ring-opacity-dark`, so it matches every other Roadie ring. `is-interactive` is now built on it, so the two compose on one element. The reset's native focus ring is unchanged.
