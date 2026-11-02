---
'@oztix/roadie-components': patch
---

Fix `DateTime` failing hydration in Safari when the server words a date differently. Engines ship different locale data, so a server-rendered September date reads "Sept" while WebKit formats "Sep", and React threw error #418 and re-rendered the page. `DateTime` now keeps the server's words through hydration.
