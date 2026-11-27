---
'@oztix/roadie-components': patch
---

`Checkbox`, `CheckboxGroup`, `RadioGroup`, `Switch`, `Slider`, `DateRangePicker` and `FileUpload` in a `Field` now announce helper and error text like the text controls: the helper text, then the error text while invalid, then any `aria-describedby` you pass, which is added rather than replacing them. Before, the error text replaced the helper text, and your own `aria-describedby` replaced both.
