---
'@oztix/roadie-components': patch
---

A `DataTable` whose rows link keeps its title column visible. The title holds
each row's only link, so its `priority` is now ignored while rows link, with a
warning in development, instead of hiding the column and the row links with it.
