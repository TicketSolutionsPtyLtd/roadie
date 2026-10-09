---
'@oztix/roadie-core': patch
'@oztix/roadie-components': patch
---

`DateTime` and `RecordTable` no longer read the clock while rendering on the
server, so they prerender under Next's `cacheComponents` without a `Suspense`
boundary, including as a `Suspense` fallback.

The date formatters read the clock only when the words depend on it: a
standalone date's year, or relative text. A `DateTime` with
`context='standalone'` renders its year on the server, then drops it after
mount when the date is in the current year. `useRecords` reads the clock in the
browser unless you pass `now`. Until then, a list filtered in the browser by a
relative date shows its loading state, as the server can't know which rows
match. Client-rendered output is unchanged.
