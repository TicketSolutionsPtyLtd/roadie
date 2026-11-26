---
'@oztix/roadie-components': patch
---

Text controls in a `Field` now announce helper and error text the same way. `Field.Input`, `Field.Textarea`, `Select`, `Combobox`, `Autocomplete`, `NumberField`, `OTPField`, `PhoneField`, `DateField` and `QueryField` are described by the helper text, then the error text while invalid, then any `aria-describedby` you pass, which is added rather than replacing them. Before, the error text replaced the helper text, and your own `aria-describedby` replaced both. `useFieldInputProps` follows the same rule.
