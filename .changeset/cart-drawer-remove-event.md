---
'@oztix/roadie-widgets': minor
---

Cart drawer can now remove a whole event from the cart (both skins). The
core client gains a `removeItem(cartId, eventId)` method that `POST`s to
`.../events/{eventId}/remove` and refetches the cart, and each skin renders a
remove-confirm popover on the event row so the action is a deliberate,
two-step interaction. This new core surface is what justifies the
`cart-drawer/core` size-limit budget.
