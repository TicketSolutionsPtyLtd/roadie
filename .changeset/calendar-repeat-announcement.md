---
'@oztix/roadie-components': patch
---

Fix `Calendar` not re-reading an announcement that repeats, such as a second "Selection cleared" in a row. Its live region skips text that hasn't changed, so a repeat now changes it.
