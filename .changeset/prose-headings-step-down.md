---
'@oztix/roadie-core': minor
'@oztix/roadie-components': minor
---

Prose headings are one step smaller, so headings in content such as an event
description no longer overwhelm the page. `.prose` and `Prose` at the default
`md` size now set headings with the `text-display-ui-1` to `-6` styles, which
`sm` used before. `sm` headings are one step smaller again, from `text-3xl` for
`h1` to `text-sm` for `h6`. `size='lg'` sets the old heading scale, the
`text-display-prose-1` to `-6` styles, so use it for the old look. Body sizes
and spacing are unchanged.
