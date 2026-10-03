---
'@oztix/roadie-components': patch
---

Navigator's pending glow draws its spinning square small and scales it up.
The conic gradient sits on a square an eighth of the frame's diagonal, scaled
eight times, rather than one drawn at one and a half times the frame's long
side. Under heavy load Safari could show the frame's corners while the old,
very large layer turned. The square still covers the frame at every angle,
and reduced motion still holds it still.
