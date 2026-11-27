---
'@oztix/roadie-components': patch
---

Fix a `className` function being dropped on `Dialog`, `Drawer`, `Menu`, `Popover`, and `Tooltip` parts. Base UI's types accept `className={(state) => …}`, and each part now adds the classes it returns beside its own.
