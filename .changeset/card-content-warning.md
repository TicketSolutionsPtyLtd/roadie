---
'@oztix/roadie-components': patch
---

Warn in development when a `Card` has no `Card.Content`. `Card.Header` has no bottom padding, so a card with only a title and description puts them in `Card.Content`. `Card.Content` registers with its card, so it counts inside a fragment or your own component, and production builds skip the check. Keep a `Suspense` boundary inside `Card.Content`, not around it, or the card warns while it loads. A `RecordGrid` or narrow `RecordTable` card with no details now renders its title row as the card's `Card.Content`.
