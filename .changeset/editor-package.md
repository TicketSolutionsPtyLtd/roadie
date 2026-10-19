---
'@oztix/roadie-editor': minor
---

New package `@oztix/roadie-editor`, Roadie's rich-text editor on Tiptap v3.
This release ships its saved format in `@oztix/roadie-editor/schema`, which
has no React and runs on a server. `EditorValue` is
`{ version, preset, doc }`, where `doc` is Tiptap's JSON with Tiptap's default
node and mark names.

- `presets.basic` holds paragraphs, hard breaks, bulleted and numbered lists,
  bold, italic, underline (`underline`), and links. A saved link holds only its `href`, and any `href`
  that `isUnsafeHref` flags is refused.
- `presets.rich` adds headings 2 to 4 (`heading`, saving only `level`), quotes
  (`blockquote`), dividers (`horizontalRule`), images (`image`, saving only
  `src` and `alt`), and embeds (`embed`, saving only `provider`, `id`, and
  `params`, never a URL), and tables (`table`, `tableRow`, `tableHeader` and
  `tableCell`, saving only each cell's `colspan` and `rowspan`, never a
  width). A cell holds paragraphs only. A pasted `h1` reads as a heading 2, and `h5` and
  `h6` as a heading 4. An image's `src` must be `https` or a root-relative
  path.
- `migrate` checks a stored value and brings it up to `CURRENT_VERSION`,
  throwing a `RangeError` on an unknown preset, a newer version, or a value or
  `doc` that isn't an object, and skipping malformed children and marks.
  `migrate(value, preset)` reads a value into another preset. Either way it
  drops each node and mark the preset doesn't hold and keeps their text, so a
  value never loads as an empty document. It also drops unsafe links, keeping
  their text, images with any other `src`, and malformed embeds, and brings a
  heading level into 2 to 4. It keeps only the attributes the preset saves
  and the first mark of each type, starts every list item with a paragraph,
  drops a list or quote left empty, and gives an empty `doc` one paragraph,
  so every value it returns loads in Tiptap. In a table it keeps only cells
  in rows and only paragraphs in cells, keeping other blocks' text as
  paragraphs, keeps whole positive spans, gives an empty cell a paragraph,
  and drops a row with no cells and a table with no rows. `createEmptyValue` starts a new
  value.
- `parseEmbedUrl` turns a YouTube, Vimeo, Spotify or TikTok share URL into an
  `EmbedValue` (`{ provider, id, params? }`), `embedSrc` rebuilds the player
  URL from one (YouTube through youtube-nocookie.com, and Vimeo with
  `dnt=1`), and `embedShareUrl` rebuilds its share URL. Hosts must match
  exactly, and ids and params must match each provider's patterns, so a saved
  value can't point a player anywhere else. Each `EmbedProvider` is data with
  an `aspect` (a ratio or a fixed height), an optional `label`, and an
  optional `shareUrl`; apps pass their own list, starting from
  `defaultEmbedProviders`, to add one.

`@oztix/roadie-editor/render` renders a saved value with no editor code, in a
server component or on the client. `renderEditorValue(value, { size,
className })` returns React elements in `Prose`, with links through Roadie's
`Link`, and `renderEditorHtml` returns the same content as an HTML string in
a `.prose` element. Both run `migrate` first, render only the nodes, marks
and attributes the value's preset defines, drop a link whose href is unsafe
and keep its text, and never render raw HTML. Underline renders as `u`,
headings as `h2` to `h4`, images with `loading="lazy"`, and embeds as a lazy, sandboxed `iframe`
whose `src` `embedSrc` rebuilds; both take `embedProviders`, and drop embeds
from any provider not in it.
