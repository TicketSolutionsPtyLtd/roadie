---
'@oztix/roadie-editor': minor
---

Update the `Editor`'s stylesheet rules for its own parts to sit in the components layer, so a utility class that reaches one, such as an arbitrary variant in the editor's `className`, now wins over them as it does over Roadie's other classes. That covers the placeholder and hint text, a selected block's ring, an embed and its cover, a selected table cell, the gap cursor's place, a section's name and hover ring, and the toolbar's hiding while previewing. An invalid editor's edge and fill and the gap cursor's line stay outside a layer.
