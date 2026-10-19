---
'@oztix/roadie-components': minor
---

`useFieldControlError(message)` is now public in
`@oztix/roadie-components/field`. A custom control calls it to show its own
error, such as a file it couldn't upload, in the nearest `Field.ErrorText`,
as Roadie's date and time fields already do. Pass `null` to clear it.
