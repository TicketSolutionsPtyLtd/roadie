---
'@oztix/roadie-components': patch
---

Fix a `className` function being dropped on `Button`, `Progress`, `Switch`, and `Toggle` parts and the `CheckboxGroup` and `RadioGroup` roots. Base UI's types accept `className={(state) => …}`, and each part now adds the classes it returns beside its own. A `Button` with `href` calls it with `{ disabled }`.
