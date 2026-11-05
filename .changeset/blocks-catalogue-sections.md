---
'@oztix/roadie-blocks': minor
---

Add `catalogueSections()` (`@oztix/roadie-blocks/catalogue/sections`), which turns the blocks an app passes into the editor's `sections`: one per block, named such as `heroSection`, a template per preset with its thumbnail from `thumbnailUrl`, and the block's text, layout, alignment, size, surface, and colour as settings.

Each catalogue block gains `keywords`, such as `cta` and `banner` for Call to action, which the editor's insert menu finds it by. Align, Size and Colour show the block's own default while unset.
