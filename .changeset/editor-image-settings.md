---
'@oztix/roadie-editor': minor
---

Add Image settings, in place of the image toolbar's Alt text. It edits the image's link, where an email's image links to (a web address or a link variable), its width, Fit or Full width, its alignment when it fits, and its alt text, each applied as it's made: Done, Escape, or a click away keeps the changes as one step, which undo puts back. The Image control and the `/` menu's Image now add an image from its link in every preset that holds images, https only in an email, with Upload an image beside it when there's an `onUploadImage`. Image settings also sets a page image's width, alignment and caption, and opens from the bottom on a phone. The No alt text badge now shows only on a selected image, on an opaque chip. Its widths read Fit and Full width and its alignments Left, Centre and Right, as Button settings' do, it opens with focus on its first style choice, its source field is Image address, and on a phone it takes half the screen with no blur, the image kept above it.

A gap cursor between blocks, such as between an image and a section, is now a line across the section, column or page it's in, rather than a 20px mark over the block before it.

In the `blocks` and `email` presets, a click on an image or an embed opens its settings first, an image's as a popover or, on a phone, a sheet, with its toolbar once they close, and their block menus lead with Settings. A touch opens them on one already selected. Image settings and Embed settings are led by their title, "Changes apply as you go. Undo puts them back.", and Done. A gap cursor below an image draws its line in the gap, not over the image.
