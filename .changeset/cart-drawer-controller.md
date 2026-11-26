---
'@oztix/roadie-widgets': patch
---

A page that mounts both the React and Vue `CartDrawer` now keeps body scroll locked until both have closed, since the two skins share one scroll lock, open height, and height spring. Nothing else changes for apps.
