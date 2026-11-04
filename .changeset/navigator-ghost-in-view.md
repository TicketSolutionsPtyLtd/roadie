---
'@oztix/roadie-components': patch
---

`Navigator`'s page step on a phone copies only the part of the page it leaves that shows, so the step's first frame no longer styles and lays out the whole page a second time. What's scrolled out of view becomes an empty box of the same size, so the copy keeps the page's height and scroll position.
