---
'@oztix/roadie-core': minor
'@oztix/roadie-components': patch
'@oztix/roadie-widgets': patch
---

`@oztix/roadie-core/theme` exports `DEFAULT_ACCENT_COLOR`, so components, widgets, and apps share one default accent. Its value is `#0191eb`, the accent step 9 that tokens.css ships. `@oztix/roadie-components` re-exports it, and its value changes from `#0091EB` to `#0191eb`, one step of red apart, so the default matches the tokens. The Vue cart drawer theme reads the same constant.
