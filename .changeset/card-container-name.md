---
'@oztix/roadie-components': patch
---

A `Card` with `direction='auto'` is now a container named `card`, so its
children can use `@min-[30rem]/card:` and know it resolves against the card
rather than a container further up.
