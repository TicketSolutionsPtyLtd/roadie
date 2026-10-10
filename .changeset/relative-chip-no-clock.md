---
'@oztix/roadie-components': patch
---

Records.Search names a relative date filter's chip, such as "Upcoming", without its dates until the browser has read the clock. Before, a server-rendered chip announced the range as at 1 Jan 1970 until the page loaded.
