---
'@oztix/roadie-components': patch
---

`Pane.Header`'s height reaches what the pane holds in the frame Back or Close shows (in Chromium; elsewhere a frame later, as before), so a pane push restyles the pane's content once, not twice. Nothing looks different.
