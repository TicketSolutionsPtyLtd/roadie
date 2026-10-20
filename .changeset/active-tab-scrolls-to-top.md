---
'@oztix/roadie-components': patch
---

Tapping the active tab of a collapsed `Navigator` bar on its own route now
scrolls the page back to the top in browsers with the Navigation API, such as
Chrome. A pane now restores a remembered scroll only when you arrive at it:
going back or forward, or changing destination.
