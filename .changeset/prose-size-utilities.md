---
'@oztix/roadie-core': minor
'@oztix/roadie-components': patch
---

Add the `prose-sm` and `prose-lg` utilities, so `.prose` markup without the Prose component, such as a Vue skin or a server-rendered page, can use Prose's `sm` and `lg` sizes. `cn()` lets one replace the other. Prose's `size` now adds these utilities, with the same values as before.
