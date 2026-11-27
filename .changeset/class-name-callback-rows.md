---
'@oztix/roadie-components': patch
---

Fix a `className` function being dropped on `Checkbox`, `CheckboxGroup.Item`, `RadioGroup.Item`, and a `Switch` with a `label` or `description`. A string still styles the row. A function needs the control's state, so it now styles the box, the radio, or the switch, beside their own classes.
