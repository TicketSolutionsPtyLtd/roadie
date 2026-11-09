---
'@oztix/roadie-editor': minor
---

Read an HTML email's buttons and columns on import. A link alone on its line, or beside only blocks and breaks, becomes a button when it has its own fill or border and is padded or `inline-block`, or fills a padded one-cell table, keeping its centre or right alignment, and a class's style from the source's style sheet counts. A row of two to four cells of blocks whose widths add up to 100% becomes columns. Both used to become plain text. A link around an image becomes the image's link, a web address or a link variable, where it used to be dropped. The import dialog also opens an `.html` or `.mjml` file with Choose a file.
