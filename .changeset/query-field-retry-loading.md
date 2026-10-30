---
'@oztix/roadie-components': patch
---

Fix `QueryField` reading "No suggestions" while it asks again for text whose last request failed, such as on reopening. It now reads "Loading suggestions" until the retry settles.
