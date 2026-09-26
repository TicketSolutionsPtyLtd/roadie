---
'@oztix/roadie-components': patch
---

Select, Combobox and Autocomplete options no longer stay filled after a tap on a
touch screen when the list stays open, such as a multiple select. A highlight
the pointer made only fills where the pointer can hover, and a keyboard
highlight still shows everywhere.

Switch, Checkbox, CheckboxGroup, RadioGroup, Select, NumberField and OTPField
now point `aria-describedby` at the text `Field` actually renders. A control
marked `invalid` inside a valid `Field` pointed at an error text that was never
rendered, so screen readers lost the helper text.
