---
'@oztix/roadie-components': minor
---

`listItemVariants` gains an `interactive` variant, true by default. Set it to
false for a row whose link or control sits inside it, and style the row with
`is-interactive-within`, marking that link `data-interactive-target`. Without
the marked link, a subtler row keeps its tinted fill at rest. `List.Item` is
unchanged.
