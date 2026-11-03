---
'@oztix/roadie-widgets': patch
---

Import Roadie components from their own subpaths instead of the root entry, so a bundler or the Next.js compiler resolves only the components the cart renders, not the whole root entry.
