---
'@oztix/roadie-components': patch
---

`DataTable` styles its grouped rows' collapse, indent and last row, its scroller, and its container with classes in its own components, and stops setting `data-grouped`, `data-instant`, `data-collapsed`, `data-last` and `data-overlay-clip`. Nothing looks different: groups still open and close like an Accordion, and a long table's still snap.
