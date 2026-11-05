import { type JSONContent, getSchema } from '@tiptap/core'
import { type Schema, DOMParser as SchemaParser } from '@tiptap/pm/model'

import { isEmailImageSrc } from './emailAttrs'
import {
  type EmbedProvider,
  defaultEmbedProviders,
  parseEmbedUrl
} from './embed'
import { isSafeImageSrc } from './imageSrc'
import {
  type Preset,
  type PresetShape,
  isPreset,
  presetShapes
} from './presetShapes'
import { presets } from './presets'
import { CURRENT_VERSION, type EditorValue, migrate } from './value'

/**
 * Content an import couldn't keep. `src` is left out for a `data:` URI.
 * `importEmail` also reports `hidden` text, such as a preheader, a `link` on
 * an image, its `src` the link's href, and an MJML `element` it has no block
 * for, by `tag`, whose text it keeps.
 */
export type DroppedContent = {
  kind: 'image' | 'embed' | 'media' | 'hidden' | 'link' | 'element'
  src?: string
  tag?: string
}

const schemas = new Map<Preset, Schema>()

function schemaFor(preset: Preset) {
  const schema = schemas.get(preset) ?? getSchema(presets[preset])
  schemas.set(preset, schema)
  return schema
}

export function report(kind: DroppedContent['kind'], src: string | null) {
  return src && !/^\s*data:/i.test(src) ? { kind, src } : { kind }
}

// Old embed and image code writes addresses protocol-relative.
export function absoluteSrc(element: Element | null | undefined) {
  const src = element?.getAttribute('src')?.trim() || null
  return src?.startsWith('//') ? `https:${src}` : src
}

function embedFor(
  iframe: Element,
  preset: Preset,
  providers: readonly EmbedProvider[]
) {
  if (!Object.hasOwn(presetShapes[preset].nodes, 'embed')) return null
  const value = parseEmbedUrl(absoluteSrc(iframe) ?? '', providers)
  if (!value) return null
  const embed = iframe.ownerDocument.createElement('div')
  embed.dataset.embed = ''
  embed.dataset.provider = value.provider
  embed.dataset.id = value.id
  if (value.params) embed.dataset.params = JSON.stringify(value.params)
  return embed
}

// The schema would skip these quietly, so each is swapped or removed here,
// where what's lost can be reported. A cell holds only paragraphs, so no
// image or embed survives in one, unless the preset turns cells into text.
function keptMedia(
  body: HTMLElement,
  preset: Preset,
  providers: readonly EmbedProvider[]
) {
  const dropped: DroppedContent[] = []
  const shape: PresetShape = presetShapes[preset]
  const canHoldImages = Object.hasOwn(shape.nodes, 'image')
  const isKeptSrc = shape.httpsImages ? isEmailImageSrc : isSafeImageSrc
  const canHoldTables = Object.hasOwn(shape.nodes, 'table')
  for (const element of body.querySelectorAll(
    'img, iframe, video, audio, object, embed'
  )) {
    if (!element.isConnected) continue
    const src = absoluteSrc(element)
    const inCell = canHoldTables && element.closest('td, th') !== null
    if (element.localName === 'img') {
      if (canHoldImages && !inCell && isKeptSrc(src)) {
        element.setAttribute('src', src)
        continue
      }
      dropped.push(report('image', src))
    } else if (element.localName === 'iframe') {
      const embed = inCell ? null : embedFor(element, preset, providers)
      if (embed) {
        element.replaceWith(embed)
        continue
      }
      dropped.push(report('embed', src))
    } else {
      dropped.push(
        report(
          'media',
          src ||
            element.getAttribute('data') ||
            absoluteSrc(element.querySelector('source[src]'))
        )
      )
    }
    element.remove()
  }
  return dropped
}

const TABLE_PARTS = 'table, caption, thead, tbody, tfoot, tr, td, th'
const BLOCKS_IN_CELL =
  'ul, ol, li, h1, h2, h3, h4, h5, h6, blockquote, table, caption, thead, tbody, tfoot, tr, td, th'

function asTextBlock(element: Element) {
  const block = element.ownerDocument.createElement('div')
  block.append(...element.childNodes)
  element.replaceWith(block)
}

// A cell holds only paragraphs, and the schema would lift any other block
// out past its table, so each becomes a block of text where it stands. With
// no table in the preset, cells would run together, so the table's parts all
// do, which also holds a table nested in another block.
function cellsAsText(body: HTMLElement, preset: Preset) {
  if (!Object.hasOwn(presetShapes[preset].nodes, 'table')) {
    body.querySelectorAll(TABLE_PARTS).forEach(asTextBlock)
    return
  }
  for (const cell of body.querySelectorAll('td, th')) {
    cell.querySelectorAll(BLOCKS_IN_CELL).forEach(asTextBlock)
  }
}

const isBreak = (node: JSONContent) => node.type === 'hardBreak'
const isBlank = (node: JSONContent) =>
  node.type === 'text' && /^\s*$/.test(node.text ?? '')

// CKEditor's ENTER_BR writes a <br> per Enter, so a blank line between
// breaks is where one paragraph ends and the next starts.
function paragraphsAtBreaks(paragraph: JSONContent): JSONContent[] {
  const runs: JSONContent[][] = [[]]
  let pending: JSONContent[] = []
  for (const node of paragraph.content ?? []) {
    if (isBreak(node) || (pending.length > 0 && isBlank(node))) {
      pending.push(node)
      continue
    }
    const run = runs.at(-1) ?? []
    if (pending.filter(isBreak).length > 1) runs.push([node])
    else run.push(...(run.length > 0 ? pending : []), node)
    pending = []
  }
  const kept = runs.filter((run) => run.length > 0)
  if (kept.length === 0 && pending.length === 0) return [paragraph]
  return kept.map((content) => ({ ...paragraph, content }))
}

const isBlankParagraph = (node: JSONContent) =>
  node.type === 'paragraph' && (node.content ?? []).every(isBlank)

// CKEditor spaces blocks with empty and `&nbsp;` paragraphs.
function withoutSpacers(doc: JSONContent): JSONContent {
  return {
    ...doc,
    content: (doc.content ?? []).filter((node) => !isBlankParagraph(node))
  }
}

function splitAtBreaks(node: JSONContent): JSONContent {
  if (!node.content) return node
  return {
    ...node,
    content: node.content.flatMap((child) =>
      child.type === 'paragraph'
        ? paragraphsAtBreaks(child)
        : [splitAtBreaks(child)]
    )
  }
}

/** Reads a parsed body into a doc in `preset`, before `migrate`. */
export function bodyToDoc(
  body: HTMLElement,
  preset: Preset,
  providers: readonly EmbedProvider[]
) {
  const dropped = keptMedia(body, preset, providers)
  cellsAsText(body, preset)
  const doc = withoutSpacers(
    splitAtBreaks(
      SchemaParser.fromSchema(schemaFor(preset)).parse(body).toJSON()
    )
  )
  return { doc, dropped }
}

/**
 * Reads HTML, such as CKEditor output, into a value in `preset`, through
 * `migrate`, so the result always loads. Text is kept, except fallback text
 * inside a dropped media element; styles, fonts, colours and classes are
 * dropped. Two or more `<br>` in a paragraph start a new one, and empty
 * paragraphs between blocks go. A link around an image isn’t kept.
 * Images the preset can't hold or load, iframes no embed provider reads, and
 * video, audio and plugin elements are dropped and listed in `dropped`, in
 * document order, so an app can warn before overwriting legacy content.
 *
 * Iframes become embeds when one of `embedProviders` reads their player URL;
 * pass the editor's own providers if it has them.
 *
 * Needs a browser's `DOMParser`, so call it in an effect or event handler.
 * Throws a RangeError on an unknown preset.
 */
export function htmlToEditorValue(
  html: string,
  preset: Preset,
  {
    embedProviders = defaultEmbedProviders
  }: { embedProviders?: readonly EmbedProvider[] } = {}
): { value: EditorValue; dropped: DroppedContent[] } {
  if (!isPreset(preset)) {
    throw new RangeError(`Unknown EditorValue preset "${preset}".`)
  }
  if (typeof DOMParser === 'undefined') {
    throw new Error('htmlToEditorValue needs a browser’s DOMParser.')
  }
  // Without the <body>, a leading <noscript> would open in <head>, and its
  // content would spill into the body.
  const { body } = new DOMParser().parseFromString(`<body>${html}`, 'text/html')
  // A page with script never shows a noscript.
  body.querySelectorAll('noscript, title').forEach((hidden) => hidden.remove())
  const { doc, dropped } = bodyToDoc(body, preset, embedProviders)
  const value = migrate({ version: CURRENT_VERSION, preset, doc }, preset)
  return { value, dropped }
}
