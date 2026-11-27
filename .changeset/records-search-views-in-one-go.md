---
'@oztix/roadie-components': patch
---

A server's search field in Records follows a later search set from outside, such as the URL, after `setView` runs twice before a render. It used to read that search as an echo of the first view and keep showing the old draft.
