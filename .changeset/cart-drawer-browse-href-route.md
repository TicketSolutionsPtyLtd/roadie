---
'@oztix/roadie-widgets': patch
---

`buildBrowseHref`, and so `CartDrawer`'s default "Browse events" target, now
returns the collection route with the id in the path,
`/collection/{collectionId}`, instead of `/collection/?id={collectionId}`.
