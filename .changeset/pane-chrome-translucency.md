---
'@oztix/roadie-components': patch
---

`Pane` header and footer now go solid for someone who reduces transparency. They use the `is-translucent` recipe over the pane's own surface, so the fill matches other translucent chrome: 85% (88% in dark mode) instead of 80%, under the same 12px blur.
