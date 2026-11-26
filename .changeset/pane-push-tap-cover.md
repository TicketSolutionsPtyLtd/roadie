---
'@oztix/roadie-components': patch
---

Speed up a phone pane push: a pane sliding away no longer switches off `pointer-events` over its whole subtree. Navigator covers it until its slide ends instead, so a quick second tap still can't open it again.
