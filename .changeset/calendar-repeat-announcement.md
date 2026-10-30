---
'@oztix/roadie-components': patch
---

Fix `Calendar` reading a repeated announcement only once, such as "2 dates selected" after a parent changes several dates twice in a row. Its live region skips text that hasn't changed, so a repeat now changes it.
