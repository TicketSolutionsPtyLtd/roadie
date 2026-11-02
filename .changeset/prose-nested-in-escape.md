---
'@oztix/roadie-core': patch
---

A `.prose` inside a `.not-prose` or `data-not-prose` element now typesets its own content. Before, the escape switched off every Prose inside it, so rich text in a component that escapes the page's Prose, such as a marketing block in a docs preview, rendered unstyled. The sheet's rules now sit in `@scope (.prose) to (.not-prose, [data-not-prose])` at the same specificity as before, and an escape inside the nested Prose still escapes.
