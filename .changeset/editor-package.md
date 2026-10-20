---
'@oztix/roadie-editor': minor
---

First release of `@oztix/roadie-editor`, the rich-text `Editor` on Tiptap v3.

A rich-text field that saves its content as an `EditorValue`, `{ version, preset, doc }`, in JSON, never HTML. Three subpaths ship:

- `@oztix/roadie-editor/editor`: `Editor`, a rich-text field. `preset='basic'` (the default) holds paragraphs, lists, bold, italic, underline, and links. `preset='rich'` adds headings 2 to 4, quotes, dividers, images (through `onUploadImage`), embeds from YouTube, Vimeo, Spotify, and TikTok, and tables. It takes `value`, `defaultValue`, and `onValueChange`, plus `placeholder`, `readOnly`, `disabled`, `size` (the `Prose` sizes), and `emphasis` (`normal`, `subtle`, or `subtler` for content edited in place). In a `Field` it takes its label, description, `invalid`, `required`, and `disabled`, and `name` submits the value with a native form. Its code loads after the page, behind a skeleton; `preloadEditor()` starts it sooner, and `useEditorContext()` gives custom toolbar controls the Tiptap editor. Import `@oztix/roadie-editor/css` after the components' CSS.
- `@oztix/roadie-editor/schema`: the saved format, with no React, so it runs on a server. `presets`, `migrate` (brings a stored value up to `CURRENT_VERSION`, or into another preset, dropping what the preset can't hold), `createEmptyValue`, and the embed helpers `parseEmbedUrl`, `embedSrc`, `embedShareUrl`, and `defaultEmbedProviders`.
- `@oztix/roadie-editor/render`: `renderEditorValue` returns React elements in `Prose`, and `renderEditorHtml` an HTML string in `.prose`, with none of the editor's code.

Unsafe links, such as `javascript:`, never reach a saved value: the editor refuses them, pasted HTML loses them, and `migrate` and the renderers drop them and keep their text. An embed saves its provider and id, never a URL.
