---
'@oztix/roadie-components': patch
---

An `Autocomplete` or `Combobox` input inside a `Field` keeps the `Field.Label`
as its accessible name while its list is open. Opening the list hides
everything outside it from assistive tech, including the label, so the input
now also points at the label with `aria-labelledby`. Your own `aria-label` or
`aria-labelledby` still wins.
