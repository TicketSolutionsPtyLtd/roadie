---
'@oztix/roadie-components': patch
---

`Sortable` loads its Move menu when it is needed, instead of with the list, so `@oztix/roadie-components/sortable` and everything that draws a sortable list (`file-upload`, `record-board`) ships less JavaScript up front. A handle is a plain menu button until a press or key asks for its menu, and opens the same way on that first press. The menu loads early when the pointer or focus reaches a handle or the page goes idle. A list also mounts a menu only for a handle that has opened one, where every handle used to mount its own.
