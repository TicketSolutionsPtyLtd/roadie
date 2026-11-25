---
'@oztix/roadie-editor': minor
---

Update the `Editor`'s own stylesheet rules to sit in the components layer, so a class you put on its parts now wins over them as it does over Roadie's other classes: the placeholder and hint text, a selected block's ring, an embed and its cover, a selected table cell, the gap cursor's place, a section's name and hover ring, and the toolbar's hiding while previewing. An invalid editor's edge and fill, and the gap cursor's line, stay outside a layer, since they have to beat the `emphasis-field` class, the text's inset classes, and the line Tiptap draws.
