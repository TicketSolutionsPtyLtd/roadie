---
'@oztix/roadie-editor': minor
---

Add conditions to the email preset. A section, button, image, spacer, or divider can save a `showWhen` rule, `{ key, op, value }`, naming a variable, where `op` is `exists`, `equals`, `notEquals`, `lessThan`, or `greaterThan`. `renderEmail` wraps a conditional block in a Liquid `{% if %}` with `syntax: 'liquid'`, or shows it only when its rule holds with `values` for a preview. It throws on a rule in the `ae` syntax, which has no conditions, on a rule naming a variable the list doesn't have or whose Liquid token isn't a plain variable, and on a value a Liquid string can't hold. `migrate` drops a malformed rule and keeps its block.
