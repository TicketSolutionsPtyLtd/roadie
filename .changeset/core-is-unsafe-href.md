---
'@oztix/roadie-core': minor
---

Add `isUnsafeHref` to `@oztix/roadie-core/utils`. It returns true for an `href` that uses `javascript:`, `data:`, `vbscript:`, `blob:`, or `file:`, ignoring case and leading whitespace, so editors and server renderers can refuse the same links Roadie's link components do.
