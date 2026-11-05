# @oztix/roadie-editor

## 0.2.0

### Minor Changes

- b6ff15e: Add `types` to `roadie.manifest.json`: each exported object type a component's props name, such as an item in a list prop, with its import path and every field's type, whether it's required, and its description. It follows each field's type to the next type the same package exports, so a CMS or an agent can check every nested field a component needs, such as a Testimonial quote's `person` and that person's `name`, which a prop's type name alone (`readonly TestimonialQuote[]`) didn't say. Fields keep the same rules as props: literal unions are listed in the order they're declared, and fields from the DOM or React are left out. A type re-exported under another name gives that name as `export`, a generic type lists its `typeParameters`, and a type that also takes keys it doesn't name gives their type as `additionalFields`.

### Patch Changes

- 5804e39: Update Tiptap to 3.32.1.
- a54bf74: Stop publishing `.d.ts.map` files. They pointed at source the package doesn't ship, so go-to-definition landed on nothing. The JavaScript source maps still embed their source, so stack traces and debuggers still show it.

## 0.1.0

### Minor Changes

- 0b24b01: First release of `@oztix/roadie-editor`, the rich-text `Editor` on Tiptap v3.

  A rich-text field that saves its content as an `EditorValue`, `{ version, preset, doc }`, in JSON, never HTML. Three subpaths ship:

  - `@oztix/roadie-editor/editor`: `Editor`, a rich-text field. `preset='basic'` (the default) holds paragraphs, lists, bold, italic, underline, and links. `preset='rich'` adds headings 2 to 4, quotes, dividers, images (through `onUploadImage`), embeds from YouTube, Vimeo, Spotify, and TikTok, and tables. It takes `value`, `defaultValue`, and `onValueChange`, plus `placeholder`, `readOnly`, `disabled`, `size` (the `Prose` sizes), and `emphasis` (`normal`, `subtle`, or `subtler` for content edited in place). In a `Field` it takes its label, description, `invalid`, `required`, and `disabled`, and `name` submits the value with a native form. Its code loads after the page, behind a skeleton; `preloadEditor()` starts it sooner, and `useEditorContext()` gives custom toolbar controls the Tiptap editor. Import `@oztix/roadie-editor/css` after the components' CSS.
  - `@oztix/roadie-editor/schema`: the saved format, with no React, so it runs on a server. `presets`, `migrate` (brings a stored value up to `CURRENT_VERSION`, or into another preset, dropping what the preset can't hold), `createEmptyValue`, and the embed helpers `parseEmbedUrl`, `embedSrc`, `embedShareUrl`, and `defaultEmbedProviders`.
  - `@oztix/roadie-editor/render`: `renderEditorValue` returns React elements in `Prose`, and `renderEditorHtml` an HTML string in `.prose`, with none of the editor's code.

  Unsafe links, such as `javascript:`, never reach a saved value: the editor refuses them, pasted HTML loses them, and `migrate` and the renderers drop them and keep their text. An embed saves its provider and id, never a URL.
