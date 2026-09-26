---
'@oztix/roadie-components': patch
---

Select and Combobox now type `multiple`. The roots are generic over the value
and `multiple`, like Base UI's, so `<Select multiple>` takes an array for
`value` and `defaultValue` and hands one to `onValueChange`. A single select
infers its value type from `value` or `defaultValue` instead of `unknown`.
`SelectProps` and `ComboboxProps` take the same optional type parameters for
wrappers.

A Select trigger no longer grows past its container. A long label truncates
with the icon kept in view, and a multiple select shows the labels that fit
then counts the rest, such as "Bee Gees, Custard +2". Screen readers still hear
every label.
