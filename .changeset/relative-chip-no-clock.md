---
'@oztix/roadie-components': patch
---

Records.Search names a relative date filter's chip, such as "Upcoming", without its dates until the browser has read the clock, and the empty state does the same. Before, a server-rendered chip read its dates as 1 Jan 1970 until the page hydrated.
