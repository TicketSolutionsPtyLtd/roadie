---
'@oztix/roadie-components': patch
---

Select and Combobox now type `multiple`. The roots are generic over the value
and `multiple`, like Base UI's, so `<Select multiple>` takes an array for
`value` and `defaultValue` and hands one to `onValueChange`. A single select
infers its value type from `value` or `defaultValue` instead of `unknown`.
`SelectProps` and `ComboboxProps` take the same optional type parameters for
wrappers.
