---
'@oztix/roadie-components': minor
---

Add `Callout`, an inline message that sits in the flow of the page. The short
form takes `intent`, `title` and the body as children, and shows a status icon
for `info`, `success`, `warning` and `danger`. The compound form
(`Callout.Icon`, `Callout.Title`, `Callout.Description`, `Callout.Actions`)
covers actions and rich bodies; actions sit below the text in a narrow callout
and beside it in a wide one. `emphasis` takes Badge's values and defaults to
`subtle`, `onDismiss` adds a dismiss button, and `Callout.Title` becomes a
heading through `render`.
