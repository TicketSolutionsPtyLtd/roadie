---
'@oztix/roadie-components': patch
---

Fix a `className` function being dropped on `Button`, `Progress`, `Switch`, and `Toggle` parts and the `CheckboxGroup` and `RadioGroup` roots. Base UI's types accept `className={(state) => …}`, and each part now adds the classes it returns beside its own. A `Button` with `href` calls it with `{ disabled }`. `Checkbox`, `CheckboxGroup.Item`, `RadioGroup.Item`, and a `Switch` with a `label` or `description` put `className` on their row, a plain element, where a function is still dropped.
