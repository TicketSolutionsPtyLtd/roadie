# @oztix/roadie-editor

The rich-text editor for the
[Roadie Design System](https://ticketsolutionsptyltd.github.io/roadie/), and
the saved format it reads and writes. Built on
[Tiptap](https://tiptap.dev/) v3, using its MIT parts only.

## Install

```bash
pnpm add @oztix/roadie-editor @oztix/roadie-components @oztix/roadie-core @phosphor-icons/react
```

Tiptap is a dependency of this package, pinned to one version, so apps never
install it themselves.

## The editor

```tsx
import { Editor } from '@oztix/roadie-editor/editor'

;<Editor
  aria-label='Event description'
  placeholder='Tell people about the night'
  value={value}
  onValueChange={setValue}
/>
```

Add `@import '@oztix/roadie-editor/css';` after the components' CSS. `Editor`
loads Tiptap after the page, and shows a skeleton on the server and until it
has loaded. Call `preloadEditor()` on the hover or focus that leads to one.

## The saved format

Store an `EditorValue`, never HTML:

```ts
import type { EditorValue } from '@oztix/roadie-editor/schema'

const description: EditorValue = {
  version: 1,
  preset: 'basic',
  doc: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', marks: [{ type: 'bold' }], text: 'Doors open 7pm.' }
        ]
      }
    ]
  }
}
```

- `version` is the format's version. `CURRENT_VERSION` is the one this
  package writes.
- `preset` names the set of nodes and marks the document may hold.
  `presets.basic` has paragraphs, hard breaks, bulleted and numbered lists,
  bold, italic, underline (`underline`), and links. A link saves only its `href`. `presets.rich` adds
  headings 2 to 4 (`heading`, saving only `level`), quotes (`blockquote`),
  dividers (`horizontalRule`), images (`image`, saving only `src` and
  `alt`), embeds (`embed`, saving only `provider`, `id`, and `params`), and
  tables (`table`, `tableRow`, `tableHeader` and `tableCell`, saving only a
  cell's `colspan` and `rowspan`). A cell holds paragraphs only.
  An image's `src` is `https` or a root-relative path, and its `alt` is `''`
  until someone writes it.
  `presets.email` holds the basic preset's text plus headings 2 to 4, and
  layout blocks: sections (`section`), columns (`columns`, holding two to
  four `column`s), buttons (`button`, saving only `href`, with its label as unmarked text and
  variables), images
  (`image`, saving only `src`, `alt`, and `width`), spacers (`spacer`, saving
  only `height`), and dividers (`horizontalRule`). A button links to https,
  http, mailto, or tel, an image's `src` is https only, its `width` is 1 to
  600 pixels or `null` to fill its column, and a spacer is 8 to 160 pixels
  high. A list item holds text blocks only. A merge tag is an inline
  `variable`, saving only `key` and, when it has one, `fallback`; its token
  is chosen when the email renders. A section and each email block can
  save a `showWhen` rule, `{ key, op, value }`, naming a variable; columns
  and text blocks never do, so a conditional paragraph goes in a section.
- `doc` is Tiptap's JSON, with Tiptap's default names (`paragraph`,
  `bulletList`, `bold`…), so any Tiptap or ProseMirror tool reads it.

`@oztix/roadie-editor/schema` has no React and runs anywhere, including on a
server. `getSchema(presets.basic)` from `@tiptap/core` gives the ProseMirror
schema a document must fit.

## Reading a stored value

Pass every value read from storage through `migrate` before using it:

```ts
import { migrate } from '@oztix/roadie-editor/schema'

const value = migrate(JSON.parse(row.description))
```

`migrate` brings an older value up to `CURRENT_VERSION`. It throws a
`RangeError` on a preset it doesn't know and on a version newer than this
package, so an app running an older release never misreads newer content, and
on a value or `doc` that isn't an object. It skips `content` or `marks` that
aren't a list, any child or mark that isn't an object, and empty text.

`migrate(value, preset)` reads the value into `preset` instead of its own.
Either way, it drops every node and mark the preset doesn't hold and keeps
their text: a block's text becomes a paragraph, and marked text stays,
unmarked, and a `doc` below the root gives way to its blocks. So a value
never loads as an empty document, which the next save would store. It also drops any link whose `href`
could run script, such as `javascript:`, and keeps its text, and drops any
image whose `src` isn't `https` or root-relative, and any embed without a
string `provider` and `id`, keeping only those and `params`. It reads a heading level
outside 2 to 4 as the nearest of them, and missing alt text as `''`. It keeps
only the attributes the preset saves and the first mark of each type, starts
every list item with a paragraph, drops a list or quote left empty, and gives
an empty `doc` one paragraph. In a table, it keeps only cells in rows and
only paragraphs in cells, keeping the text of any other block as paragraphs,
keeps a cell's `colspan` and `rowspan` only when whole, positive and no more
than HTML allows (1,000 and 65,534), gives an empty cell a paragraph, and drops a row with no cells and a table with no
rows. Read into `basic`, a table keeps its cells' text as paragraphs. So
every value it returns loads in Tiptap. `createEmptyValue(preset)` starts a
new value.

## Rendering a stored value

```tsx
import {
  renderEditorHtml,
  renderEditorValue
} from '@oztix/roadie-editor/render'

renderEditorValue(value, { size: 'md' }) // React elements in Prose
renderEditorHtml(value, { size: 'md' }) // the same, as an HTML string
```

Both run `migrate` first and need none of the editor's code, so they work in a
server component. They render only the nodes, marks and attributes the value's
preset defines, through the table in `src/render/elements.ts`, and keep only
the text of the rest. Links go through Roadie's `Link`, and an unsafe href
drops the link but keeps its text. A table renders in a `.prose-scroll`, so a
wide one scrolls on a phone rather than widening the page, with a first row
of header cells in a `thead`, unless one spans down, as a `thead` would clip
it.

## Sending a stored value as email

```ts
import { renderEmail } from '@oztix/roadie-editor/email'

const { html, text } = await renderEmail(value, { theme })
```

It reads the value into the email preset, builds MJML's JSON tree from it in
`src/email/mjmlTree.ts`, and renders that with MJML on the server, then
writes the plain text from the HTML. Text goes into the tree already escaped,
since MJML writes its content and attributes as given. Each variable goes in
as a private-use placeholder, written as its token or value once MJML is done
(`src/email/mergeTags.ts`), so a token is never escaped and a value always is.
A block's `showWhen` rule goes in as placeholders in `mj-raw` siblings around
it (`src/email/conditions.ts`), written as a Liquid `if` and `endif`. MJML stays behind
`renderEmail`: nothing exported names it, so the renderer can change without
a migration.

## Changing the format

Node names, mark names and their attributes are public API: products store
them. Any change to them, in any preset:

1. bumps `CURRENT_VERSION`, and
2. adds a step to `migrate` that turns the previous version into the new one.

A new node or mark also needs its entry in `src/render/elements.ts`, or the
renderers drop it, and an email node its entry in `src/email/mjmlTree.ts`.

A value is never rewritten in place without a version bump.

## Embeds

An embed saves its provider and id, never a URL:

```ts
import { embedSrc, parseEmbedUrl } from '@oztix/roadie-editor/schema'

const video = parseEmbedUrl('https://youtu.be/exampleVid1')
// { provider: 'youtube', id: 'exampleVid1' }, or null for an unsupported URL
const src = video && embedSrc(video)
// 'https://www.youtube-nocookie.com/embed/exampleVid1'
```

`defaultEmbedProviders` covers YouTube, Vimeo, Spotify, SoundCloud, Deezer,
Apple Music and TikTok. Hosts must match exactly, and every id and param must
match its provider's pattern before `embedSrc` builds a URL, so a stored value
can't point a player anywhere else.
To add a provider, pass `[...defaultEmbedProviders, yours]` as the second
argument of both functions, and as `embedProviders` to `Editor`,
`renderEditorValue`, and `renderEditorHtml`.
