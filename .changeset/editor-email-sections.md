---
'@oztix/roadie-editor': minor
---

The email preset's ready-made sections lead the Blocks drawer and are in the `/` menu too, found by name or as `/lineup` and `/unsubscribe`. A ready-made section now goes after the top-level block with the caret, or before an empty top-level line, so never inside another section, and its first line's text is selected, so typing replaces the placeholder. Any block the drawer or `/` adds selects its first line's text the same way. A block picked on an empty line now takes that line's place, so no empty line is sent; an email may end with a section or columns, with no empty line after it; and Enter on a section's empty last line takes it out after the section, as lists do. A Lineup section joins the others, and sections are found by more names, such as `/banner`, `/tickets`, and `/cta`.
