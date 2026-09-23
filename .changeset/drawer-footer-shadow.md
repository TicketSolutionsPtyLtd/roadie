---
'@oztix/roadie-components': patch
---

`Drawer.Footer` casts a shadow up over the body while there's more to scroll
beneath it, so a long list reads as passing under the footer rather than
being cut off. The shadow fades out once the list reaches its end.
