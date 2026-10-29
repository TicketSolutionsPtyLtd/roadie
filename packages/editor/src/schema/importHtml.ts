import { type JSONContent, getSchema } from '@tiptap/core'
import { type Schema, DOMParser as SchemaParser } from '@tiptap/pm/model'

import {
  type EmbedProvider,
  defaultEmbedProviders,
  parseEmbedUrl
} from './embed'
import { isSafeImageSrc } from './imageSrc'
import { type Preset, isPreset, presetShapes } from './presetShapes'
import { presets } from './presets'
import { CURRENT_VERSION, type EditorValue, migrate } from './value'

/** Content an import couldn't keep. `src` is left out for a `data:` URI. */
export type DroppedContent = {
  kind: 'image' | 'embed' | 'media'
  src?: string
}

const schemas = new Map<Preset, Schema>()

function schemaFor(preset: Preset) {
  const schema = schemas.get(preset) ?? getSchema(presets[preset])
  schemas.set(preset, schema)
  return schema
}

function report(kind: DroppedContent['kind'], src: string | null) {
  return src && !/^\s*data:/i.test(src) ? { kind, src } : { kind }
}

function embedFor(
  iframe: Element,
  preset: Preset,
  providers: readonly EmbedProvider[]
) {
  if (!Object.hasOwn(presetShapes[preset].nodes, 'embed')) return null
  // Old embed code, YouTube's among it, writes players protocol-relative.
  const src = (iframe.getAttribute('src') ?? '').trim()
  const value = parseEmbedUrl(
    src.startsWith('//') ? `https:${src}` : src,
    providers
  )
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
// image or embed survives in one.
function keptMedia(
  body: HTMLElement,
  preset: Preset,
  providers: readonly EmbedProvider[]
) {
  const dropped: DroppedContent[] = []
  const canHoldImages = Object.hasOwn(presetShapes[preset].nodes, 'image')
  for (const element of body.querySelectorAll(
    'img, iframe, video, audio, object, embed'
  )) {
    if (!element.isConnected) continue
    const src = element.getAttribute('src')
    const inCell = element.closest('td, th') !== null
    if (element.localName === 'img') {
      if (canHoldImages && !inCell && isSafeImageSrc(src)) continue
      dropped.push(report('image', src))
    } else if (element.localName === 'iframe') {
      const embed = inCell ? null : embedFor(element, preset, providers)
      if (embed) {
        element.replaceWith(embed)
        continue
      }
      dropped.push(report('embed', src))
    } else {
      dropped.push(report('media', src ?? element.getAttribute('data')))
    }
    element.remove()
  }
  return dropped
}

const BLOCKS_IN_CELL =
  'ul, ol, li, h1, h2, h3, h4, h5, h6, blockquote, table, caption, thead, tbody, tfoot, tr, td, th'

function asTextBlock(element: Element) {
  const block = element.ownerDocument.createElement('div')
  block.append(...element.childNodes)
  element.replaceWith(block)
}

// A cell holds only paragraphs, and the schema would lift any other block
// out past its table, so each becomes a block of text where it stands. With
// no table in the preset, cells would run together, so each cell does.
function cellsAsText(body: HTMLElement, preset: Preset) {
  const canHoldTables = Object.hasOwn(presetShapes[preset].nodes, 'table')
  for (const cell of body.querySelectorAll('td, th')) {
    if (!cell.isConnected) continue
    if (!canHoldTables) asTextBlock(cell)
    else cell.querySelectorAll(BLOCKS_IN_CELL).forEach(asTextBlock)
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

/**
 * Reads HTML, such as CKEditor output, into a value in `preset`, through
 * `migrate`, so the result always loads. Text is kept, except fallback text
 * inside a dropped media element; styles, fonts, colours and classes are
 * dropped. Two or more `<br>` in a paragraph start a new one.
 * Images the preset can't hold or load, iframes no embed provider reads, and
 * video, audio and plugin elements are dropped and listed in `dropped`, in
 * document order, so an app can warn before overwriting legacy content.
 *
 * Iframes become embeds when one of `embedProviders` reads their player URL;
 * pass the editor's own providers if it has them.
 *
 * Needs a browser's `DOMParser`. Throws a RangeError on an unknown preset.
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
  const { body } = new DOMParser().parseFromString(html, 'text/html')
  const dropped = keptMedia(body, preset, embedProviders)
  cellsAsText(body, preset)
  const doc = splitAtBreaks(
    SchemaParser.fromSchema(schemaFor(preset)).parse(body).toJSON()
  )
  const value = migrate({ version: CURRENT_VERSION, preset, doc }, preset)
  return { value, dropped }
}
