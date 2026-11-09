---
'@oztix/roadie-blocks': patch
---

A catalogue section draws whatever was saved for it without throwing. Its text and choices must be strings, and its images and buttons keep only their own fields, so a saved `style` on an image or an object as a button's label is left out. A block's action `icon` that names no icon, such as `constructor`, draws no icon. An `illustration` that names no spot illustration draws none on a card or stat, and the block's default on Hero, RichText, and CallToAction. A block's or Mosaic tile's `size`, or a Gallery's or CallToAction's `ratio`, that names none of its values draws as the default.
