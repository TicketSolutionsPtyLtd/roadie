---
'@oztix/roadie-core': minor
---

One rule for the two motion prefixes: `animate-*` plays now, once, as a
keyframe animation; `motion-*` is state-driven enter/exit only, a transition
on Base UI's `data-starting-style` / `data-ending-style`.

Renamed the keyframe mount animations to match:

- `motion-fade-in` → `animate-fade-in`
- `motion-scale-in` → `animate-scale-in`
- `motion-pop-in` → `animate-pop-in`

`motion-fade-out` and `motion-scale-out` are deprecated with no replacement —
use `motion-scale` or `motion-slide` for the exit instead.

All five old names remain as deprecated aliases until v3.
