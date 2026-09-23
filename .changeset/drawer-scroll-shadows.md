---
'@oztix/roadie-components': patch
---

`Drawer.Header` and `Drawer.Footer` cast a shadow over the body while it
scrolls beneath them, so a long list reads as passing under the header and
footer rather than being cut off. Each shadow fades out when there's nothing
left to scroll on its side.
