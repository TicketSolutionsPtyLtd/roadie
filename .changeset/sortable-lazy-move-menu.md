---
'@oztix/roadie-components': patch
---

`Sortable` loads its Move menu when a handle is first reached, instead of with the list, so `@oztix/roadie-components/sortable` and everything that draws a sortable list (`file-upload`, `record-board`) ships less JavaScript up front. A handle is a plain menu button until the pointer or focus reaches one or the page goes idle, and it opens the same way once the menu has loaded. A list also mounts a menu only for a handle that has opened one, where every handle used to mount its own.
