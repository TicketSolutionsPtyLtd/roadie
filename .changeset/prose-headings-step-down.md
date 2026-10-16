---
'@oztix/roadie-core': minor
'@oztix/roadie-components': minor
---

Prose headings are one step smaller, so headings in content such as an event
description no longer overwhelm the page. `.prose` and `Prose` at the default
`md` size now set headings with the `text-display-ui-1` to `-6` styles, which
`sm` used before. `sm` headings are one step smaller again, from `text-3xl` for
`h1` to `text-sm` for `h6`. `lg` headings keep the old scale, the
`text-display-prose-1` to `-6` styles. Body sizes and spacing are unchanged.

To keep the old headings at the default body size, set the heading variables
on the `.prose` element: `--prose-h1-size: var(--text-5xl)` and
`--prose-h1-weight: 900`, down to `--prose-h6-size: var(--text-lg)` and
`--prose-h6-weight: 700`, one text step per level, all at weight 700 but `h1`.
