---
'@oztix/roadie-components': patch
---

Tapping the active tab of a collapsed `Navigator` bar on its own route now
scrolls the page back to the top in browsers with the Navigation API, such as
Chrome. Before, the pane wrote back the scroll it had remembered for that
history entry and cancelled the scroll. A pane now restores a remembered
scroll only when you arrive at it, by going back or forward or by changing
destination.
