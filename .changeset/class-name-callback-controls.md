---
'@oztix/roadie-components': patch
---

Fix a `className` function being dropped on `Button`, `CheckboxGroup`, `Progress`, `RadioGroup`, `Switch`, `Toggle`, and `ToggleGroup` parts. Base UI's types accept `className={(state) => …}`, and each part now adds the classes it returns beside its own. A `Button` with `href` calls it with `{ disabled }`. A `Switch` with a `label` or `description` puts `className` on its row, a plain element, where a function is still dropped.
