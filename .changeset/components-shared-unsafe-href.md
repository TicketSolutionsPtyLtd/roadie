---
'@oztix/roadie-components': patch
---

Link components check for unsafe `href` protocols with `isUnsafeHref` from `@oztix/roadie-core/utils`, so they also refuse an unsafe protocol hidden with a tab, line break, or control character.
