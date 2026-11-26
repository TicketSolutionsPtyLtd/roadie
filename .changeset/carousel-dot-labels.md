---
'@oztix/roadie-components': minor
---

Add `getDotLabel` to `Carousel.Dots` to name each dot, such as "Ticket 2 of 5" in a strip named "Choose a ticket" with `aria-label`. It gets the 0-based index of the dot's slide and the number of slides, or of its page and the number of pages when slides scroll in groups. The index stays the slide's when `max` windows the strip. Without it, each dot is still named "Go to slide N".
