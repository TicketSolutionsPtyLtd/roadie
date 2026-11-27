---
'@oztix/roadie-components': patch
---

`Countdown` paints an invisible, screen-reader-hidden placeholder on the server instead of nothing, so the text after it moves less when it hydrates (exactly, for a count under ten minutes). A virtualised `RecordGrid` no longer starts from a one-column guess: it draws its first cards and holds the room for the rest by the columns the width gives, so the page below it stays put, and it sizes unseen rows from a card as drawn.
