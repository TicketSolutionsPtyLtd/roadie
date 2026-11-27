---
'@oztix/roadie-components': patch
---

Fix a `className` function being dropped on `Collapsible`, `Select`, `Slider`, `Tabs`, and `ToggleGroup` parts. Base UI's types accept `className={(state) => …}`, and each part now adds the classes it returns beside its own.
