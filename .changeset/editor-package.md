---
'@oztix/roadie-editor': minor
---

New package `@oztix/roadie-editor`, Roadie's rich-text editor on Tiptap v3.
This release ships its saved format in `@oztix/roadie-editor/schema`, which
has no React and runs on a server. `EditorValue` is
`{ version, preset, doc }`, where `doc` is Tiptap's JSON with Tiptap's default
node and mark names.

- `presets.basic` holds paragraphs, hard breaks, bulleted and numbered lists,
  bold, italic, and links. A saved link holds only its `href`, and any `href`
  that `isUnsafeHref` flags is refused.
- `presets.rich` adds headings 2 to 4 (`heading`, saving only `level`), quotes
  (`blockquote`), dividers (`horizontalRule`), images (`image`, saving only
  `src` and `alt`), and embeds (`embed`, saving only `provider`, `id`, and
  `params`, never a URL). A pasted `h1` reads as a heading 2, and `h5` and
  `h6` as a heading 4. An image's `src` must be `https` or a root-relative
  path.
- `migrate` checks a stored value and brings it up to `CURRENT_VERSION`,
  throwing a `RangeError` on an unknown preset, a newer version, or a value or
  `doc` that isn't an object, and skipping malformed children and marks.
  `migrate(value, preset)` reads a value into another preset. Either way it
  drops each node and mark the preset doesn't hold and keeps their text, so a
  value never loads as an empty document. It also drops unsafe links, keeping
  their text, images with any other `src`, and malformed embeds, and brings a
  heading level into 2 to 4. `createEmptyValue` starts a new value.
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
and keep its text, and never render raw HTML. Headings render as `h2` to
`h4`, images with `loading="lazy"`, and embeds as a lazy, sandboxed `iframe`
whose `src` `embedSrc` rebuilds; both take `embedProviders`, and drop embeds
from any provider not in it.

`@oztix/roadie-editor/editor` adds `Editor`, a rich-text field on the `basic`
preset, reading a value in another preset into it and keeping the text of what
it can't hold. Content the editor still can't read stays read-only with an
error, and saves nothing over the stored value. It takes `value`,
`defaultValue` and `onValueChange` with an `EditorValue`, plus `placeholder`,
`readOnly`, `disabled`, `size` (the `Prose` sizes) and `emphasis`: `normal`
(the default) and `subtle` match `Textarea`'s, and `subtler` is a boxless
frame for content edited in place, with no border, fill, padding or focus
ring, so the text lines up with the page; an invalid `subtler` editor draws a
danger edge at its start. Its code loads after the page: on the server and
until then it renders a `Skeleton` the shape of the empty editor, and
`preloadEditor()` starts the load early. `Editor.Content` is the editable
`textbox`, styled as `.prose`, and `useEditorContext()` gives custom children
the Tiptap editor. Pasted HTML goes through the preset's schema, so only what
the preset holds survives. Import `@oztix/roadie-editor/css` for the
placeholder and the `subtler` invalid edge.

`Editor.Toolbar` is a bar at the top of the editor, a size smaller than the
text, that hugs its controls, scrolls away with the text, and looks the same
whether you're editing or not, so the text never moves. It takes Toolbar's
`emphasis` (`normal` by default), independent of the editor's. On a phone or
touch screen its controls scroll sideways on one row. The controls are Bold,
Italic, Link, Bulleted list, Numbered list, Undo, and Redo, each with its
shortcut in a tooltip; the toggles show pressed for the text at the caret,
and Undo and Redo are disabled, but focusable, when there's nothing to undo or
redo. Alt+F10 in the text moves focus to the toolbar, and Escape moves it back
to the caret. With no children `Editor` renders `<Editor.Toolbar />` then
`<Editor.Content />`; `Editor.Toolbar`'s own children follow its controls, and
can run commands through `useEditorContext()`.

In a `Field`, `Editor` is named by `Field.Label`, described by its helper or
error text, and takes `invalid`, `required`, and `disabled` from the field.
`disabled` also works on its own, and `name` adds a hidden input holding the
value as JSON, so a native form submits it.

`Mod+K` or the Link control opens a popover by the selection to add, change,
or remove a link, adding `https://` to a bare domain, and typed or pasted web
addresses link themselves. The popover is one row: a bare input named by
`aria-label`, then icon buttons to save (disabled, but focusable, until
there's something to save), remove an existing link, and close. Enter saves,
but not the Enter that ends an IME composition, and a refused link shows its
error under the row. Any `href` that `isUnsafeHref` flags is refused there,
dropped from pasted HTML, and removed by `migrate`, so a stored value never
holds one.

`Editor` takes `preset`. With none it edits its value's own preset, or
`basic` without a value, and a `preset` that differs reads the value into it,
with a warning in development. `<Editor preset='rich'>` leads its toolbar with
a Block type menu (Paragraph, Heading 2 to 4, and Quote) named for the block
at the caret, and adds Divider, Image, and Embed controls. `## `, `### `,
`#### `, `> ` and `---` work as you type.

Images: `Editor` takes `onUploadImage(file)`, resolving to `{ src, alt? }`.
With it the rich toolbar has an Image control, and picked, pasted, or dropped
image files upload behind a placeholder, with a rejection's message in
`Field.ErrorText`. Without it, image files are ignored. An image with no alt
text shows a warning badge until its Alt text popover, opened by Enter or the
image's own toolbar, fills it; clearing alt text an image already had can be
saved.

Embeds: a supported share link pasted alone on an empty line embeds, and the
Embed control takes a link in a popover, refusing one no provider reads.
`Editor` takes `embedProviders` (default `defaultEmbedProviders`) and an async
`resolveUrl(url)` for short links entered there. The editor shows each player
in a sandboxed, lazy `iframe` at its provider's shape, under a cover so a
click selects it, and the arrow keys and Backspace select and delete it. A
player with a ratio is no taller than 36rem, so a portrait one stays narrow.

Clicking or arrowing onto an image or embed shows its own toolbar, 8px inside
its media's top-end corner: Alt text, Replace image (with `onUploadImage`,
keeping the alt text), and Remove image, or Edit link (starting from the
embed's share URL and replacing it with the new link's player) and Remove
embed. Its selection ring hugs the media. Alt+F10 moves focus to a selected
node's toolbar and Escape returns to the node, and each action is one undo
step.
