---
'@oztix/roadie-components': patch
---

Fix a `className` function being dropped on `Button`, `Progress`, `Switch`, and `Toggle` parts, the `CheckboxGroup` and `RadioGroup` roots, and `Checkbox`, `CheckboxGroup.Item`, and `RadioGroup.Item`. Base UI's types accept `className={(state) => …}`, and each part now adds the classes it returns beside its own. A `Button` with `href` calls it with `{ disabled }`. On `Checkbox`, `CheckboxGroup.Item`, `RadioGroup.Item`, and a `Switch` with a `label` or `description`, a string still styles the row, and a function, which needs the control's state, styles the box, the radio, or the switch.
