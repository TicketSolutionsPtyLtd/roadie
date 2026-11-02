---
'@oztix/roadie-components': patch
---

Fix `DateTime` failing hydration when the browser words a date differently from the server. Engines ship different locale data: a server-rendered September date reads "Sept", Playwright's WebKit formats "Sep", and React threw error #418 and re-rendered the page. `DateTime` now keeps the server's words through hydration.
