---
'@oztix/roadie-components': patch
---

`Pane.Body` fills the pane's `measure` instead of shrinking to its content, so a `Callout` or `Card` inside it takes the measured width, at every `measure` and `measureAlign`. Content beside `Pane.Body`, such as a `Pane.BodyTitle`, fills it too.
