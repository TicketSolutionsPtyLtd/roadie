---
'@oztix/roadie-components': minor
---

`Card.Footer` reads `--card-footer-size` when it's a side column, with
`direction='horizontal'` or a split `direction='auto'`. Set it once on a list
so every card's side column, and a ticket's perforation along it, lines up
whatever each footer holds. It's a minimum, so a wider footer still grows
rather than overflowing, and a stacked footer ignores it.
