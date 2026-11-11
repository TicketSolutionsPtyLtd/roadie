---
'@oztix/roadie-blocks': minor
---

Add `catalogueSections()` (`@oztix/roadie-blocks/catalogue/sections`), which turns the blocks an app passes into the editor's `sections`: one per block, named such as `heroSection`, a template per preset with its thumbnail from `thumbnailUrl`, and the block's text, layout, alignment, size, surface, and colour as settings.

Each catalogue block gains `keywords`, such as `cta` and `banner` for Call to action, which the editor's insert menu finds it by. Align, Size, Colour and Surface show what the block draws while unset, which can differ by layout, such as Cards' centred Plain and left-aligned Photo, or a raised Call to action, whose Surface offers no None. Align reads Left and Centre, as an image's and a button's do.

A section's settings now cover every part of its block: images and logos as `image` settings, buttons as a list of `action`s up to the preset's limit, and items such as cards, questions and stats as a `list` of their text and images. A section draws whatever was saved for it without throwing: its text and choices must be strings, and its images and buttons keep only their own fields, so a saved `style` on an image or an object as a button's label is left out.
