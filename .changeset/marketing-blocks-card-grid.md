---
'@oztix/roadie-marketing-blocks': minor
---

Add `CardGrid` (`@oztix/roadie-marketing-blocks/card-grid`), a block of like items, such as benefits, services, steps, contact options, values, or people, as cards in columns or alternating rows. Its presets are `illustrated-cards`, `marked-cards`, `overlap-cards`, `numbered-cards`, `link-cards`, `alternating-rows`, `portraits`, and `lists`, and its columns follow the block's own width rather than the window's. An item with an `href` links its title and makes the whole card clickable, and `actions` adds links under the cards. `intent`, `emphasis`, and `cardEmphasis` set its tint, its section's surface, and its cards' surface, and an item's `intent` tints its own card.

The raised section under `illustrated-cards` and `portraits` and the raised `link-cards` now use Roadie's `raised` emphasis, so they gain its rim and shadow, and link cards take `Card`'s radius and padding.
