---
'@oztix/roadie-components': minor
---

Add `Button` `pending`, for an action that is under way. The button, `IconButton`, or `href` button stops responding, keeps focus and its place in the tab order, and keeps its size, and after 200ms a spinner in the label's colour takes the label's place. It sets `aria-busy` and `aria-disabled`, and `disabled` wins. Records' save and delete view dialogs use it for their submit buttons.
