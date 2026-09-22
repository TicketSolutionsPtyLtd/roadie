---
'@oztix/roadie-components': minor
---

Add `variant='ticket'` to `Card`. It cuts a real notch into each side where the
body meets `Card.Footer`, with a perforated line between them, and works with
every emphasis.

Add `direction` to `Card`. It lays out any card's parts: `vertical` (the
default) stacks them, `horizontal` gives `Card.Footer` a column of its own
beside the rest of the card, and `auto` stacks below 30rem and splits into two
columns at or above it. On a ticket, the notches and the perforation follow
whichever layout is in effect.
