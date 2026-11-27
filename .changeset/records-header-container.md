---
'@oztix/roadie-components': patch
---

Fix `Records.Header` and `Records.Actions` moving after hydration on a phone. They now fold with a container query instead of measuring in JavaScript, so a header under 40rem paints with its actions in the More actions menu from the first frame. `Records.Header` is now a size container, and `Records.Actions` folds by the nearest container around it, such as the header.
