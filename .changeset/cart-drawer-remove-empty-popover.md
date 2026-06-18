---
'@oztix/roadie-widgets': minor
---

Cart drawer: remove an event via an inline confirm popover, an in-drawer empty
state that slides and fades out on close, and fullscreen-on-open on mobile.

Fixes:

- "Browse events" now navigates to the collection events page
  (`/collection/?id=…`) instead of the cart route.
- The remove-confirm popover aligns within the drawer (React/Vue parity) and no
  longer blocks the drawer's close button while open.
