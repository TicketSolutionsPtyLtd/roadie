---
'@oztix/roadie-core': minor
---

Add the `.prose` class, which typesets raw HTML from a CMS, Markdown, or MDX:
headings, paragraphs, lists, tables, code, quotes, rules, figures, and keys.
It caps each direct child at a 65ch measure, spaces blocks from one
`--prose-flow` variable, and draws every colour from intent tokens. The flow
is a registered length that resolves once, at the body size, so the space
around a heading follows the body text rather than the heading's size. Add
`.prose-bleed` to a child to lift the measure, wrap a wide table in
`.prose-scroll` to scroll it, and use `.not-prose` or `data-not-prose` to opt a
subtree out. The `--prose-*` variables adjust size, leading, rhythm, measure,
and heading sizes and weights.

The `Prose` component in `@oztix/roadie-components` moves onto it in this
release; its release note lists what changes on the page.
