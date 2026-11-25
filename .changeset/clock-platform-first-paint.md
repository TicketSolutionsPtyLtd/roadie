---
'@oztix/roadie-components': patch
---

`Kbd`, standalone `DateTime` and `Calendar` no longer move when a server-rendered page hydrates. `Kbd` renders both platform faces on the server, and a small inline script after the keys shows the reader's (⌘ on Apple, Ctrl elsewhere) before the first paint. A standalone `DateTime` keeps its year on the server, and an inline script drops it before the first paint when it is the reader's year. A `Calendar` with no month to open on holds its room with an unseen month, with its header and weekday row, rather than an estimated box, so a `fixedWeeks` calendar holds still when the browser fills it in. Where a content security policy blocks inline scripts, `Kbd` and `DateTime` settle after mount, as before.
