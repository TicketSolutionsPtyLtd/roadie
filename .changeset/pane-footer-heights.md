---
'@oztix/roadie-components': patch
---

Fix three ways bottom-sticky content misread a `Pane.Footer`. A nested pane without a footer no longer clears its parent's. A pane with two footers clears both, and losing one keeps the other. A footer in a plain `Drawer`, not just an inspector drawer, is now cleared too.
