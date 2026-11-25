---
'@oztix/roadie-core': patch
---

An app bundled with esbuild now takes only the parts of zod that `@oztix/roadie-core/records` and `/dashboard` use, not all of it: `/records` drops from about 95 KB to 44 KB brotli. Rolldown, Vite and webpack already did this, so their bundles don't change.
