import { isEmailImageSrc } from './emailAttrs'
import { type EmbedProvider, defaultEmbedProviders } from './embed'
import { type DroppedContent, bodyToDoc, report } from './importHtml'
import { mergeTagTokens } from './mergeTagTokens'
import { CURRENT_VERSION, type EditorValue, migrate } from './value'
import type { EditorVariable } from './variables'

export type EmailSourceFormat = 'html' | 'mjml'

export type ImportEmailOptions = {
  /** The editor's `variables`, whose tokens are read as merge tags. */
  variables?: readonly EditorVariable[]
  embedProviders?: readonly EmbedProvider[]
}

export type ImportedEmail = {
  value: EditorValue
  format: EmailSourceFormat
  /** Content that couldn't come across, in document order. */
  dropped: DroppedContent[]
  /**
   * Formatting the email preset doesn't hold, whose text is kept: style
   * sheets and styled elements, and tables, outermost only.
   */
  restyled: { styles: number; tables: number }
  /** Text written like a merge tag that no variable's token matches, each once. */
  unknownMergeTags: string[]
}

const PROLOGUE = /^﻿?\s*(?:(?:<\?[\s\S]*?\?>|<!--[\s\S]*?-->)\s*)*/

/** Whether `source` is MJML, from its `<mjml>` root, or HTML. */
export function emailSourceFormat(source: string): EmailSourceFormat {
  return /^<mjml[\s>/]/i.test(source.replace(PROLOGUE, '')) ? 'mjml' : 'html'
}

// What each MJML element carries across, beyond the padding the email's own
// spacing replaces. Anything else is styling.
const MAPPED_ATTRS = new Map<string, readonly string[]>([
  ['mj-button', ['href', 'align', 'target', 'rel', 'title', 'name']],
  [
    'mj-image',
    ['src', 'alt', 'width', 'href', 'target', 'rel', 'title', 'name']
  ],
  ['mj-spacer', ['height']],
  ['mj-navbar-link', ['href', 'target', 'rel']],
  ['mj-social-element', ['href', 'name', 'target', 'rel']]
])
const LAYOUT_ATTR = /^(?:padding|inner-padding|css-class|mj-class)/

const STYLED = '[style], [bgcolor], [background], font'
const HIDDEN = '[hidden], [style*="display:none" i], [style*="display: none" i]'

type Reading = {
  doc: Document
  dropped: DroppedContent[]
  styles: number
}

const tagOf = (element: Element) => element.localName

function isStyled(element: Element) {
  const mapped = MAPPED_ATTRS.get(tagOf(element)) ?? []
  return [...element.attributes].some(
    ({ name, value }) =>
      !mapped.includes(name) &&
      !LAYOUT_ATTR.test(name) &&
      !(tagOf(element) === 'mj-button' && name === 'width' && value === '100%')
  )
}

function created(
  { doc }: Reading,
  tag: string,
  attrs: Record<string, string | undefined> = {},
  children: (Node | string)[] = []
) {
  const element = doc.createElement(tag)
  for (const [name, value] of Object.entries(attrs)) {
    if (value !== undefined) element.setAttribute(name, value)
  }
  element.append(...children)
  return element
}

const elementsOf = (element: Element, ...tags: string[]) =>
  [...element.children].filter((child) => tags.includes(tagOf(child)))

// An element the editor has no block for is read as nested blocks, so each
// part's text stays on a line of its own.
function asBlocks(reading: Reading, element: Element): HTMLElement {
  return created(
    reading,
    'div',
    {},
    [...element.childNodes].map((child) =>
      child instanceof Element && tagOf(child).startsWith('mj-')
        ? asBlocks(reading, child)
        : child
    )
  )
}

function linkLine(reading: Reading, links: Element[]) {
  const line = created(reading, 'p')
  links.forEach((link, index) => {
    if (index > 0) line.append(' · ')
    const label = link.textContent?.trim() || link.getAttribute('name') || ''
    line.append(
      created(reading, 'a', { href: link.getAttribute('href') ?? undefined }, [
        label
      ])
    )
  })
  return line
}

function image(reading: Reading, element: Element): Node[] {
  const src = element.getAttribute('src')
  if (!isEmailImageSrc(src)) {
    reading.dropped.push(report('image', src))
    return []
  }
  const href = element.getAttribute('href')
  if (href) reading.dropped.push(report('link', href))
  const width = /^(\d+)(?:px)?$/.exec(element.getAttribute('width') ?? '')?.[1]
  return [
    created(reading, 'img', {
      src,
      alt: element.getAttribute('alt') ?? '',
      width
    })
  ]
}

function button(reading: Reading, element: Element) {
  const align = element.getAttribute('align')
  return created(
    reading,
    'a',
    {
      'data-type': 'button',
      href: element.getAttribute('href') ?? undefined,
      'data-align': align === 'center' || align === 'right' ? align : undefined,
      'data-full-width':
        element.getAttribute('width') === '100%' ? '' : undefined
    },
    [...element.childNodes]
  )
}

function contentNodes(reading: Reading, element: Element): Node[] {
  if (isStyled(element)) reading.styles += 1
  switch (tagOf(element)) {
    case 'mj-text':
    case 'mj-raw':
    case 'mj-table':
      return [created(reading, 'div', {}, [...element.childNodes])]
    case 'mj-button':
      return [button(reading, element)]
    case 'mj-image':
      return image(reading, element)
    case 'mj-spacer': {
      const height = /^(\d+)(?:px)?$/.exec(element.getAttribute('height') ?? '')
      return [
        created(reading, 'div', {
          'data-type': 'spacer',
          'data-height': height?.[1]
        })
      ]
    }
    case 'mj-divider':
      return [created(reading, 'hr')]
    case 'mj-navbar':
      return [linkLine(reading, elementsOf(element, 'mj-navbar-link'))]
    case 'mj-social':
      return [linkLine(reading, elementsOf(element, 'mj-social-element'))]
    case 'mj-column':
      return [...element.children].flatMap((child) =>
        contentNodes(reading, child)
      )
    case 'mj-section':
      return sectionNodes(reading, element)
    default:
      reading.dropped.push({ kind: 'element', tag: tagOf(element) })
      return [asBlocks(reading, element)]
  }
}

// One column is a run of blocks, as the renderer writes them; two or more
// sit side by side.
function sectionNodes(reading: Reading, section: Element): Node[] {
  const columns = elementsOf(section, 'mj-column', 'mj-group').flatMap(
    (child) =>
      tagOf(child) === 'mj-group' ? elementsOf(child, 'mj-column') : [child]
  )
  const contents = columns.map((column) => {
    if (isStyled(column)) reading.styles += 1
    return [...column.children].flatMap((child) => contentNodes(reading, child))
  })
  if (contents.length === 1) return contents[0]!
  return [
    created(
      reading,
      'div',
      { 'data-type': 'columns' },
      contents.map((content) =>
        created(reading, 'div', { 'data-type': 'column' }, content)
      )
    )
  ]
}

const section = (reading: Reading, children: Node[]) =>
  created(reading, 'div', { 'data-type': 'section' }, children)

function bodyNodes(reading: Reading, element: Element): Node[] {
  switch (tagOf(element)) {
    case 'mj-section':
      if (isStyled(element)) reading.styles += 1
      return sectionNodes(reading, element)
    case 'mj-wrapper':
      if (isStyled(element)) reading.styles += 1
      return [
        section(
          reading,
          [...element.children].flatMap((child) =>
            tagOf(child) === 'mj-section'
              ? sectionNodes(reading, child)
              : contentNodes(reading, child)
          )
        )
      ]
    case 'mj-hero': {
      if (isStyled(element)) reading.styles += 1
      return [
        section(
          reading,
          [...element.children].flatMap((child) => contentNodes(reading, child))
        )
      ]
    }
    default:
      return contentNodes(reading, element)
  }
}

// MJML is read with the HTML parser, as `mj-text` holds HTML that isn't XML,
// so a self-closed element is closed and a table's rows get their table.
function asHtml(mjml: string) {
  return mjml
    .replace(
      /<(mj-[\w-]+)((?:\s+[^\s=/>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/>/gi,
      '<$1$2></$1>'
    )
    .replace(/(<mj-table\b[^>]*>)/gi, '$1<table>')
    .replace(/<\/mj-table>/gi, '</table></mj-table>')
}

function readMjml(source: string): Reading & { container: HTMLElement } {
  const doc = new DOMParser().parseFromString(asHtml(source), 'text/html')
  const reading: Reading = { doc, dropped: [], styles: 0 }
  const root = doc.querySelector('mjml') ?? doc.body
  const head = elementsOf(root, 'mj-head')[0]
  if (head) {
    for (const element of head.querySelectorAll('mj-preview')) {
      if (element.textContent?.trim()) reading.dropped.push({ kind: 'hidden' })
    }
    reading.styles += head.querySelectorAll('mj-style').length
  }
  const body = elementsOf(root, 'mj-body')[0] ?? root
  const container = created(
    reading,
    'div',
    {},
    [...body.children]
      .filter((child) => tagOf(child) !== 'mj-head')
      .flatMap((child) => bodyNodes(reading, child))
  )
  for (const sheet of container.querySelectorAll('style')) {
    reading.styles += 1
    sheet.remove()
  }
  return { ...reading, container }
}

function readHtml(source: string): Reading & { container: HTMLElement } {
  const doc = new DOMParser().parseFromString(source, 'text/html')
  const sheets = doc.querySelectorAll('style')
  const reading: Reading = { doc, dropped: [], styles: sheets.length }
  sheets.forEach((sheet) => sheet.remove())
  return { ...reading, container: doc.body }
}

function outermost(container: HTMLElement, selector: string) {
  return [...container.querySelectorAll(selector)].filter(
    (element) => !element.parentElement?.closest(selector)
  )
}

// A heading is bold and a link underlined already, so the styles a renderer
// writes to say so aren't read as marks.
function withoutOwnLook(container: HTMLElement) {
  for (const element of container.querySelectorAll<HTMLElement>(
    'h1, h2, h3, h4, h5, h6'
  )) {
    element.style.removeProperty('font-weight')
  }
  for (const link of container.querySelectorAll<HTMLElement>('a')) {
    link.style.removeProperty('text-decoration')
  }
}

function readTokens(
  container: HTMLElement,
  variables: readonly EditorVariable[]
) {
  const { pattern, read } = mergeTagTokens(variables)
  const unknown = new Set<string>()
  for (const link of container.querySelectorAll('a[href]')) {
    const token = read(link.getAttribute('href')!.trim())
    if (token?.variable.kind !== 'url') continue
    link.removeAttribute('href')
    link.setAttribute('data-variable', token.variable.key)
  }
  const walker = container.ownerDocument.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT
  )
  const texts: Text[] = []
  while (walker.nextNode()) texts.push(walker.currentNode as Text)
  for (const node of texts) {
    const parts: (string | Node)[] = []
    let last = 0
    for (const match of node.data.matchAll(pattern)) {
      const token = read(match[0])
      if (!token) unknown.add(match[0])
      if (!token || token.variable.kind === 'url') continue
      parts.push(node.data.slice(last, match.index))
      const tag = node.ownerDocument.createElement('span')
      tag.dataset.type = 'variable'
      tag.dataset.key = token.variable.key
      if (token.fallback) tag.dataset.fallback = token.fallback
      parts.push(tag)
      last = match.index + match[0].length
    }
    if (last === 0) continue
    node.replaceWith(...parts, node.data.slice(last))
  }
  return [...unknown]
}

/**
 * Reads an email's source, MJML or HTML, as a whole page or part of one, into
 * an email preset value, through `migrate`. MJML sections, columns, buttons,
 * images, spacers and dividers become the editor's own, and `mj-text` is read
 * as HTML. An HTML layout's tables give way to their text and images.
 * Hidden text, such as a preheader, is dropped. Each token of a `variables`
 * entry becomes a merge tag, or a link variable as a link's or button's
 * whole href, and a Liquid `default` becomes its fallback.
 *
 * Reports what it drops in `dropped`, the formatting it can't hold in
 * `restyled`, and tokens it doesn't know in `unknownMergeTags`, so an app can
 * tell the author before the import replaces anything.
 *
 * Needs a browser's `DOMParser`; MJML is read without the `mjml` package.
 */
export function importEmail(
  source: string,
  {
    variables = [],
    embedProviders = defaultEmbedProviders
  }: ImportEmailOptions = {}
): ImportedEmail {
  if (typeof DOMParser === 'undefined') {
    throw new Error('importEmail needs a browser’s DOMParser.')
  }
  const format = emailSourceFormat(source)
  const reading = format === 'mjml' ? readMjml(source) : readHtml(source)
  const { container, dropped } = reading
  // Never shown, so their text holds no merge tags to report.
  container
    .querySelectorAll('script, noscript, template')
    .forEach((element) => element.remove())
  for (const hidden of outermost(container, HIDDEN)) {
    dropped.push({ kind: 'hidden' })
    hidden.remove()
  }
  // An image block holds no link, so one around it is lost.
  for (const image of container.querySelectorAll('a[href] img')) {
    if (!isEmailImageSrc(image.getAttribute('src'))) continue
    const href = image.closest('a')!.getAttribute('href')
    dropped.push(report('link', href))
  }
  const styled = container.matches(STYLED) ? 1 : 0
  const styles =
    reading.styles + styled + container.querySelectorAll(STYLED).length
  const tables = outermost(container, 'table').length
  withoutOwnLook(container)
  const unknownMergeTags = readTokens(container, variables)
  const read = bodyToDoc(container, 'email', embedProviders)
  const value = migrate(
    { version: CURRENT_VERSION, preset: 'email', doc: read.doc },
    'email'
  )
  return {
    value,
    format,
    dropped: [...dropped, ...read.dropped],
    restyled: { styles, tables },
    unknownMergeTags
  }
}
