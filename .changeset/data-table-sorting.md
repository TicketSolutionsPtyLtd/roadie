---
'@oztix/roadie-components': minor
---

`DataTable` sorts in the browser with `sortable`. Pressing a header sorts by that
column, numbers largest first and text A to Z, and pressing it again flips the
direction. Empty and text values in a number column stay at the bottom. Start
from `defaultSort`, or control it with `sort` and `onSortChange`. Sortable
headers now show a caret: up or down on the sorted column, and a faint up-down
caret on the rest. `getSortHref` still links headers for server sorting, and
now links a number column largest first too. `sortDataTableRows` sorts rows on
a server the same way. Sparkline columns don't sort.

Pinned-cell styles now apply only inside a `DataTable`, so a `data-pin`
attribute elsewhere on the page no longer makes an element sticky.
