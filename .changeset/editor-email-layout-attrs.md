---
'@oztix/roadie-editor': minor
---

Add an image's link and alignment, a centred heading or paragraph, and column widths and phone order to the email preset's saved format, and a page image's width, alignment and caption to the rich and blocks presets'. An image saves `align: 'left' | 'right'` (centred by default) and `href` or a link `variable`; a heading or paragraph saves `align: 'center'`; and columns save `layout: 'wide-left' | 'wide-right'`, the first or last column twice the width of each other, and `stack: 'reverse'`, stacked last first on a phone. `migrate` drops any other value, and `renderEmail` writes each into MJML. On the canvas, an image with no `width` now fills its column, as the email draws it, and one with a `width` sits centred at that width unless aligned. In the rich and blocks presets, an image saves `fullWidth: true`, `align: 'center' | 'right'` (from the start by default) and an optional `caption`, which the renderers draw as a `figure` with a `figcaption`.
