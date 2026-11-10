---
'@oztix/roadie-editor': minor
---

Add the `email` preset to `@oztix/roadie-editor/schema` and `Editor`, for email templates. It holds paragraphs, headings 2 to 4, lists, bold, italic, underline and links, plus layout blocks: a `section`, `columns` holding two to four `column`s, a `button` (its label as text, linking to https, http, mailto or tel), an `image` (https only, so `onUploadImage` must return an https `src`, with an optional `width`), a `spacer` (`{ height }`) and a divider (`horizontalRule`). It holds no embeds, tables, quotes or HTML. `migrate` reads any value into it, keeping the text: a layout block where it can't sit gives way to its blocks, a button that can't link becomes a paragraph of its label, and columns outside two to four stack. `renderEditorValue` and `renderEditorHtml` render an email's text in order, with each button as a link in its own paragraph; `renderEmail` renders its layout as an email.
