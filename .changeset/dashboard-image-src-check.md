---
'@oztix/roadie-core': patch
---

Fix a static dashboard plot accepting an image `src` whose `javascript:` is hidden with a tab, line break, or control character, or that points at a `file:` URL. The check now reads a `src` as browsers do, the same way links are checked, and still accepts `blob:` previews.
