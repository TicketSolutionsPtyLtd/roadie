---
'@oztix/roadie-components': minor
---

Add `Card.Link`, the card's main link, for a card that also holds other
actions. Wrap the title in it. It covers the card, so a click anywhere follows
it, while other links and buttons in the card stay clickable above it. The card
takes its hover, press and focus states from the link, for plain and ticket
cards and every emphasis, so apps no longer restate them. Screen readers hear a
short link named by its own text rather than the whole card. It routes `href`
like every other Roadie link.

On a ticket card in a browser without `corner-shape` (Firefox today), the
footer's plain text doesn't follow the link; its own links still work.
