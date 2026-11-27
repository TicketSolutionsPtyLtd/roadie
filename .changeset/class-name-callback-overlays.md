---
'@oztix/roadie-components': patch
---

Fix a `className` function being dropped on `Dialog`, `Drawer`, `Menu`, `Popover`, and `Tooltip` parts. Base UI's types accept `className={(state) => …}`, and each part that takes one now adds the classes it returns beside its own.
