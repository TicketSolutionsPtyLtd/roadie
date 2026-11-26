---
'@oztix/roadie-components': minor
---

Add `getDotLabel` to `Carousel.Dots`, which names each dot from its slide's 0-based index and the number of slides, such as "Ticket 2 of 5" in a strip named "Choose a ticket" with `aria-label`. The index is the slide's even when `max` windows the strip. Without it, each dot is still named "Go to slide N".
