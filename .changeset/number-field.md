---
'@oztix/roadie-components': minor
---

Add `NumberField`, a number input with decrement and increment buttons, built on
Base UI's number field primitive. `<NumberField min={0} max={10} />` renders the
whole stepper; compose `NumberField.Group`, `Input`, `Decrement`, `Increment`
and `ScrubArea` when you need a different layout. The stepper buttons fill the
field's height as touch targets and turn off at `min` and `max`. `format` takes
`Intl.NumberFormat` options for currency, percentages and units. It inherits
`invalid`, `required` and `disabled` from `Field`, and takes `size` and
`emphasis` like `Input`.
