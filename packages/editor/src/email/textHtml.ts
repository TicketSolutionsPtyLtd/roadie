import type { JSONContent } from '@tiptap/core'

import { isEmailHref } from '../schema/emailAttrs'
import { headingLevel } from '../schema/headings'
import { isText } from '../schema/isText'
import type { LinkTag, MergeTag } from './mergeTags'
import type { EmailTheme } from './theme'

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '{': '&#123;',
  '}': '&#125;',
  '#': '&#35;',
  '[': '&#91;',
  ']': '&#93;'
}

/**
 * Escapes text and attribute values, since MJML writes both as given. Token
 * characters are escaped too, so a sending system fills only the variables,
 * and a merge tag's placeholder can't be typed.
 */
export const escapeHtml = (value: string) =>
  value
    .replace(/[\uE000\uE001]/g, '')
    .replace(/[&<>"'{}#[\]]/g, (char) => ESCAPES[char]!)

/** What text is written with: the theme, and where each variable goes. */
export type TextContext = {
  theme: EmailTheme
  tag: MergeTag
  linkTag: LinkTag
}

const HEADING_SIZES: Record<number, string> = {
  2: 'font-size:24px;line-height:32px',
  3: 'font-size:20px;line-height:28px',
  4: 'font-size:16px;line-height:24px'
}

const ORDERED_LIST_TYPES = new Set(['1', 'a', 'A', 'i', 'I'])

type Mark = NonNullable<JSONContent['marks']>[number]

/**
 * A link's or a button's href: its link variable's token, or its own href
 * when a mail client can open it. A link that only resolves on the site has
 * nowhere to go from a mail client.
 */
export function emailHref(
  { href, variable }: Record<string, unknown> = {},
  { linkTag }: TextContext
) {
  if (isText(variable)) return linkTag(variable)
  return isEmailHref(href) ? escapeHtml(href) : undefined
}

function marked(html: string, { type, attrs }: Mark, context: TextContext) {
  if (type === 'bold') return `<strong>${html}</strong>`
  if (type === 'italic') return `<em>${html}</em>`
  if (type === 'underline') return `<u>${html}</u>`
  const href = type === 'link' ? emailHref(attrs, context) : undefined
  if (href) {
    return `<a href="${href}" style="color:${context.theme.link};text-decoration:underline">${html}</a>`
  }
  return html
}

function unmarkedHtml(node: JSONContent, context: TextContext) {
  if (node.type === 'variable') return context.tag(node.attrs ?? {})
  return node.type === 'text' && typeof node.text === 'string'
    ? escapeHtml(node.text)
    : ''
}

/** Inline content as HTML, with its marks. */
export function inlineHtml(
  nodes: JSONContent[] = [],
  context: TextContext
): string {
  return nodes
    .map((node) => {
      if (node.type === 'hardBreak') return '<br>'
      const html = unmarkedHtml(node, context)
      if (!html) return ''
      return (node.marks ?? []).reduce(
        (marks, mark) => marked(marks, mark, context),
        html
      )
    })
    .join('')
}

function listAttrs({ start, type }: Record<string, unknown> = {}) {
  return [
    Number.isInteger(start) && start !== 1 ? ` start="${start}"` : '',
    typeof type === 'string' && ORDERED_LIST_TYPES.has(type)
      ? ` type="${type}"`
      : ''
  ].join('')
}

const LIST_STYLE = 'margin:0;padding:0 0 0 24px'

/**
 * A text block as HTML for `mj-text`, its margins zeroed so `mj-text`'s
 * padding alone spaces blocks in every client. An empty paragraph keeps its
 * line, as it does in the editor.
 */
export function textBlockHtml(node: JSONContent, context: TextContext): string {
  const inline = inlineHtml(node.content, context)
  const blocks = () =>
    (node.content ?? []).map((child) => textBlockHtml(child, context)).join('')
  switch (node.type) {
    case 'paragraph':
      return `<p style="margin:0">${inline || '&nbsp;'}</p>`
    case 'heading': {
      const level = headingLevel(node.attrs?.level)
      return `<h${level} style="margin:0;font-weight:700;${HEADING_SIZES[level]}">${inline}</h${level}>`
    }
    case 'bulletList':
      return `<ul style="${LIST_STYLE}">${blocks()}</ul>`
    case 'orderedList':
      return `<ol${listAttrs(node.attrs)} style="${LIST_STYLE}">${blocks()}</ol>`
    case 'listItem':
      return `<li>${blocks()}</li>`
    default:
      return ''
  }
}
