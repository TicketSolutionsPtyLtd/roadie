---
'@oztix/roadie-components': minor
---

Add `autoFocus` to `OTPField`, which focuses the first slot on mount, for a code screen the reader has just arrived on. It reaches the first slot rather than the root `div`, whether the root draws its own slots or you compose `OTPField.Input` children.
