---
'@oztix/roadie-core': patch
'@oztix/roadie-components': patch
---

`DateTime` no longer reads the clock while rendering on the server, so it
prerenders under Next's `cacheComponents` without a `Suspense` boundary,
including as a `Suspense` fallback.

The date formatters read the clock only when the words depend on it: a
standalone date's year, or relative text. A `DateTime` with
`context='standalone'` renders its year on the server, then drops it after
mount when the date is in the current year. Client-rendered output is
unchanged.
