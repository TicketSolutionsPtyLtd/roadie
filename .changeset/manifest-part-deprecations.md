---
'@oztix/roadie-components': patch
---

Fix `roadie.manifest.json` leaving a compound part tagged `@deprecated` out of its `deprecations` list, so `/roadie:migrate`, `/roadie:review`, and `/roadie:audit` now flag an app still using one. The entry names the part in `export`, such as `Records.Options`, with the tag's text as its `reason`.
